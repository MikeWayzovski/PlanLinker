import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePDF } from '../../hooks/usePDF';
import { BottomToolbar, TopToolbar } from './Toolbar';
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
const MAX_SCALE = 8;
const FIT_PADDING = 88;
const MIN_MARQUEE_PX = 12;

const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(3))));

const stageIsVisible = (node) => {
  if (!node) return false;
  if (node.clientWidth < 8 || node.clientHeight < 8) return false;
  return window.getComputedStyle(node).visibility !== 'hidden';
};

const normalizeMarquee = (start, end) => {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  return {
    left,
    top,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
};

const PDFViewer = ({
  source,
  sourceKey,
  title,
  fileName,
  canGoBack,
  onBack,
  onClose,
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
  const overlayRef = useRef(null);
  const panRef = useRef({ active: false, x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const boxZoomRef = useRef({ active: false, start: null });
  const pendingBoxZoomRef = useRef(null);
  const resolveGenRef = useRef(0);
  const { pdf, pageCount, isLoading, error } = usePDF(source, sourceKey);
  const [pageNumber] = useState(1);
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
  const [marquee, setMarquee] = useState(null);

  const zoomBy = useCallback((factor) => {
    setFitMode(null);
    setScale((current) => clampScale(current * factor));
  }, []);

  const fitToView = useCallback(() => {
    pendingBoxZoomRef.current = null;
    setFitMode('page');
    const stage = stageRef.current;
    if (stage) stage.scrollTo({ left: 0, top: 0 });
  }, []);

  const handleDownload = useCallback(() => {
    const url = source?.url;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || title || 'drawing.pdf';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [fileName, source, title]);

  const handleBackNavigation = useCallback(() => {
    if (canGoBack) onBack?.();
    else onClose?.();
  }, [canGoBack, onBack, onClose]);

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
    const stage = stageRef.current;
    if (!stage || tool !== 'boxzoom') return undefined;

    const clientToOverlay = (clientX, clientY) => {
      const origin = overlayRef.current?.getBoundingClientRect() || stage.getBoundingClientRect();
      return { x: clientX - origin.left, y: clientY - origin.top };
    };

    const onDown = (event) => {
      if (event.button !== 0) return;
      boxZoomRef.current = { active: true, start: { x: event.clientX, y: event.clientY } };
      const local = clientToOverlay(event.clientX, event.clientY);
      setMarquee({ left: local.x, top: local.y, width: 0, height: 0 });
      event.preventDefault();
    };

    const onMove = (event) => {
      if (!boxZoomRef.current.active || !boxZoomRef.current.start) return;
      const box = normalizeMarquee(boxZoomRef.current.start, { x: event.clientX, y: event.clientY });
      const origin = overlayRef.current?.getBoundingClientRect() || stage.getBoundingClientRect();
      setMarquee({
        left: box.left - origin.left,
        top: box.top - origin.top,
        width: box.width,
        height: box.height,
      });
    };

    const onUp = (event) => {
      if (!boxZoomRef.current.active || !boxZoomRef.current.start) return;
      const start = boxZoomRef.current.start;
      boxZoomRef.current = { active: false, start: null };
      setMarquee(null);

      const box = normalizeMarquee(start, { x: event.clientX, y: event.clientY });
      if (box.width < MIN_MARQUEE_PX || box.height < MIN_MARQUEE_PX) return;

      const canvas = stage.querySelector('.pdf-canvas');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const left = Math.max(box.left, canvasRect.left);
      const top = Math.max(box.top, canvasRect.top);
      const right = Math.min(box.left + box.width, canvasRect.right);
      const bottom = Math.min(box.top + box.height, canvasRect.bottom);
      const selectedWidth = right - left;
      const selectedHeight = bottom - top;
      if (selectedWidth < MIN_MARQUEE_PX || selectedHeight < MIN_MARQUEE_PX) return;

      const viewW = Math.max(stage.clientWidth - 48, 1);
      const viewH = Math.max(stage.clientHeight - FIT_PADDING * 2, 1);
      pendingBoxZoomRef.current = {
        fracX: (left - canvasRect.left) / canvasRect.width,
        fracY: (top - canvasRect.top) / canvasRect.height,
        fracW: selectedWidth / canvasRect.width,
        fracH: selectedHeight / canvasRect.height,
      };
      setFitMode(null);
      setScale((current) => clampScale(current * Math.min(viewW / selectedWidth, viewH / selectedHeight)));
    };

    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      stage.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      boxZoomRef.current = { active: false, start: null };
      setMarquee(null);
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

  const applyPendingBoxZoom = useCallback(() => {
    const pending = pendingBoxZoomRef.current;
    const stage = stageRef.current;
    const canvas = stage?.querySelector('.pdf-canvas');
    if (!pending || !stage || !canvas) return;

    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width < 2 || canvasRect.height < 2) return;

    pendingBoxZoomRef.current = null;
    const canvasLeft = canvasRect.left - stageRect.left + stage.scrollLeft;
    const canvasTop = canvasRect.top - stageRect.top + stage.scrollTop;
    const targetLeft = canvasLeft + canvasRect.width * pending.fracX;
    const targetTop = canvasTop + canvasRect.height * pending.fracY;
    const targetW = canvasRect.width * pending.fracW;
    const targetH = canvasRect.height * pending.fracH;
    stage.scrollLeft = Math.max(0, targetLeft - (stage.clientWidth - targetW) / 2);
    stage.scrollTop = Math.max(0, targetTop - (stage.clientHeight - targetH) / 2);
  }, []);

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
          className={`viewer-stage${tool === 'pan' ? ' is-pan' : ''}${tool === 'boxzoom' ? ' is-boxzoom' : ''}`}
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
              onRendered={applyPendingBoxZoom}
            />
          ) : null}
        </div>

        <div ref={overlayRef} className="boxzoom-overlay" aria-hidden>
          {marquee ? (
            <div
              className="boxzoom-marquee"
              style={{
                left: `${marquee.left}px`,
                top: `${marquee.top}px`,
                width: `${marquee.width}px`,
                height: `${marquee.height}px`,
              }}
            />
          ) : null}
        </div>

        <TopToolbar
          canGoBack={canGoBack}
          onBack={handleBackNavigation}
          tool={tool}
          onToolChange={setTool}
          showHotspots={showHotspots}
          onToggleHotspots={() => setShowHotspots((value) => !value)}
          onDownload={handleDownload}
          onClose={onClose}
          disabled={toolsDisabled}
          canDownload={Boolean(source?.url)}
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
        onZoomIn={() => zoomBy(BUTTON_ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
        onFitPage={fitToView}
        fitMode={fitMode}
        panelOpen={showPanel}
        onTogglePanel={onTogglePanel}
        propertiesOpen={propertiesOpen}
        onToggleProperties={() => setPropertiesOpen((open) => !open)}
        onToggleSettings={onToggleSettings}
        disabled={toolsDisabled}
      />
    </div>
  );
};

export default PDFViewer;
