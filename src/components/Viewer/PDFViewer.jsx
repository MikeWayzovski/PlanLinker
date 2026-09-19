import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePDF } from '../../hooks/usePDF';
import { BottomToolbar, LeftToolbar, TopToolbar } from './Toolbar';
import CanvasPage from './CanvasPage';
import LayerPanel from './LayerPanel';
import PropertiesPanel from './PropertiesPanel';
import ViewerNavbar from './ViewerNavbar';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';

const WHEEL_ZOOM_IN = 1.1;
const WHEEL_ZOOM_OUT = 0.9;
const BUTTON_ZOOM_STEP = 1.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const FIT_PADDING = 88;

const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(3))));

const stageIsVisible = (node) => {
  if (!node) return false;
  if (node.clientWidth < 8 || node.clientHeight < 8) return false;
  return window.getComputedStyle(node).visibility !== 'hidden';
};

const PDFViewer = ({
  source,
  sourceKey,
  title,
  canGoBack,
  onBack,
  onBrowseFiles,
  codeRegex,
  showPanel,
  onTogglePanel,
  onToggleSettings,
  onHotspotClick,
  onResolveCode,
  isBusy,
  busyLabel,
  extraToolbar,
  lookupDescription,
}) => {
  const stageRef = useRef(null);
  const panRef = useRef({ active: false, x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const { pdf, pageCount, isLoading, error } = usePDF(source, sourceKey);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState('width');
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState('select');
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [showCanvas, setShowCanvas] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [hotspots, setHotspots] = useState([]);
  const [scan, setScan] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [matchedFiles, setMatchedFiles] = useState([]);
  const [isResolving, setIsResolving] = useState(false);
  const resolveGenRef = useRef(0);

  const zoomBy = useCallback((factor) => {
    setFitMode(null);
    setScale((current) => clampScale(current * factor));
  }, []);

  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      setPageSize({ width: viewport.width, height: viewport.height });
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? WHEEL_ZOOM_IN : WHEEL_ZOOM_OUT);
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  useEffect(() => {
    const blockBrowserZoom = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
    };

    window.addEventListener('wheel', blockBrowserZoom, { passive: false, capture: true });
    window.addEventListener('gesturestart', blockBrowserZoom, { passive: false, capture: true });
    window.addEventListener('gesturechange', blockBrowserZoom, { passive: false, capture: true });
    return () => {
      window.removeEventListener('wheel', blockBrowserZoom, { capture: true });
      window.removeEventListener('gesturestart', blockBrowserZoom, { capture: true });
      window.removeEventListener('gesturechange', blockBrowserZoom, { capture: true });
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || tool !== 'pan') return undefined;

    const onDown = (event) => {
      if (event.button !== 0) return;
      panRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        scrollLeft: stage.scrollLeft,
        scrollTop: stage.scrollTop,
      };
      stage.classList.add('is-panning');
      event.preventDefault();
    };
    const onMove = (event) => {
      if (!panRef.current.active) return;
      stage.scrollLeft = panRef.current.scrollLeft - (event.clientX - panRef.current.x);
      stage.scrollTop = panRef.current.scrollTop - (event.clientY - panRef.current.y);
    };
    const onUp = () => {
      panRef.current.active = false;
      stage.classList.remove('is-panning');
    };

    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      stage.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      stage.classList.remove('is-panning');
    };
  }, [tool]);

  useEffect(() => {
    if (!fitMode || !pageSize.width || !pageSize.height) return undefined;
    const node = stageRef.current;
    if (!node) return undefined;

    const apply = () => {
      if (!stageIsVisible(node)) return;
      const availableWidth = Math.max(node.clientWidth - FIT_PADDING, 1);
      const availableHeight = Math.max(node.clientHeight - FIT_PADDING, 1);
      const widthScale = availableWidth / pageSize.width;
      const heightScale = availableHeight / pageSize.height;
      const next = clampScale(fitMode === 'page' ? Math.min(widthScale, heightScale) : widthScale);
      setScale((current) => (current === next ? current : next));
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [fitMode, pageSize.width, pageSize.height, sourceKey, showPanel, propertiesOpen]);

  const handlePageChange = (value) => {
    if (!pageCount) return;
    const next = Math.min(pageCount, Math.max(1, Number(value) || 1));
    setPageNumber(next);
    setHotspots([]);
    setScan(null);
    setSelectedHotspot(null);
    setMatchedFiles([]);
    setIsResolving(false);
    resolveGenRef.current += 1;
  };

  const handleHotspots = useCallback((nextHotspots, meta) => {
    const list = nextHotspots || [];
    setHotspots(list);
    setScan(meta || null);
    setSelectedHotspot((current) => {
      if (!current) return null;
      return list.find((spot) => spot.key === current.key) || null;
    });
  }, []);

  const resolveMatches = useCallback(
    async (spot) => {
      const generation = resolveGenRef.current + 1;
      resolveGenRef.current = generation;
      setIsResolving(true);
      setMatchedFiles([]);
      if (!onResolveCode) {
        setIsResolving(false);
        return;
      }
      try {
        const files = await onResolveCode(spot.code);
        if (resolveGenRef.current !== generation) return;
        setMatchedFiles(Array.isArray(files) ? files : []);
      } catch {
        if (resolveGenRef.current !== generation) return;
        setMatchedFiles([]);
      } finally {
        if (resolveGenRef.current === generation) setIsResolving(false);
      }
    },
    [onResolveCode],
  );

  const selectHotspot = useCallback(
    (spot, { open = false } = {}) => {
      if (!spot) return;
      setSelectedHotspot(spot);
      setPropertiesOpen(true);
      resolveMatches(spot);
      if (open) onHotspotClick?.(spot);
    },
    [onHotspotClick, resolveMatches],
  );

  const handleCanvasSelect = useCallback(
    (spot) => {
      selectHotspot(spot, { open: false });
    },
    [selectHotspot],
  );

  const handleListSelect = useCallback(
    (spot) => {
      selectHotspot(spot, { open: true });
    },
    [selectHotspot],
  );

  const toolsDisabled = !pageCount || Boolean(error);

  return (
    <div className="template-2d-viewer-container">
      <ViewerNavbar title={title} />
      <div className="template-2d-viewer-main">
        <div
          className={`viewer-stage${tool === 'pan' ? ' is-pan' : ''}`}
          ref={stageRef}
        >
          {isLoading ? (
            <div className="d-flex align-items-center justify-content-center h-100">
              <Spinner label="Opening drawing…" />
            </div>
          ) : null}

          {error ? (
            <EmptyState icon="warning" title="This PDF could not be opened" body={error.message} />
          ) : null}

          {pdf && !error ? (
            <CanvasPage
              pdf={pdf}
              pageNumber={pageNumber}
              scale={scale}
              codeRegex={codeRegex}
              onHotspots={handleHotspots}
              onSelectHotspot={handleCanvasSelect}
              selectedKey={selectedHotspot?.key}
              isBusy={isBusy}
              busyLabel={busyLabel}
              lookupDescription={lookupDescription}
              showCanvas={showCanvas}
              showHotspots={showHotspots}
              interactionMode={tool}
            />
          ) : null}
        </div>

        <LeftToolbar
          panelOpen={showPanel}
          onTogglePanel={onTogglePanel}
          onToggleProperties={() => setPropertiesOpen((open) => !open)}
          onBrowseFiles={onBrowseFiles}
        />

        <TopToolbar
          pageNumber={pageNumber}
          pageCount={pageCount}
          onPageChange={handlePageChange}
          canGoBack={canGoBack}
          onBack={onBack}
          tool={tool}
          onToolChange={setTool}
          onZoomIn={() => zoomBy(BUTTON_ZOOM_STEP)}
          fitMode={fitMode}
          onFitPage={() => setFitMode('page')}
          showHotspots={showHotspots}
          onToggleHotspots={setShowHotspots}
          onBrowseFiles={onBrowseFiles}
          disabled={toolsDisabled}
        />

        <div
          className="template-2d-viewer-panel-wrap template-2d-viewer-panel-wrap--left"
          hidden={!showPanel}
          aria-hidden={!showPanel}
        >
          <LayerPanel
            showCanvas={showCanvas}
            onToggleCanvas={setShowCanvas}
            showHotspots={showHotspots}
            onToggleHotspots={setShowHotspots}
            hotspots={hotspots}
            scan={scan}
            selectedKey={selectedHotspot?.key}
            onSelect={handleListSelect}
            disabled={isBusy}
            lookupDescription={lookupDescription}
            onClose={onTogglePanel}
          />
        </div>

        <div
          className="template-2d-viewer-panel-wrap template-2d-viewer-panel-wrap--right"
          hidden={!propertiesOpen}
          aria-hidden={!propertiesOpen}
        >
          <PropertiesPanel
            selectedHotspot={selectedHotspot}
            lookupDescription={lookupDescription}
            matchedFiles={matchedFiles}
            isResolving={isResolving}
            isBusy={isBusy}
            onOpenDetail={onHotspotClick}
            onClose={() => setPropertiesOpen(false)}
          />
        </div>
      </div>

      {extraToolbar}

      <BottomToolbar
        onToggleSettings={onToggleSettings}
        onFitPage={() => setFitMode('page')}
        fitMode={fitMode}
        onZoomIn={() => zoomBy(BUTTON_ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
        onToggleProperties={() => setPropertiesOpen((open) => !open)}
        disabled={toolsDisabled}
      />
    </div>
  );
};

export default PDFViewer;
