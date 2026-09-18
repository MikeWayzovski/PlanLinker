import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePDF } from '../../hooks/usePDF';
import Toolbar from './Toolbar';
import CanvasPage from './CanvasPage';
import HotspotPanel from './HotspotPanel';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';

const WHEEL_ZOOM_IN = 1.1;
const WHEEL_ZOOM_OUT = 0.9;
const BUTTON_ZOOM_STEP = 1.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const FIT_PADDING = 32;

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
  settingsOpen,
  onToggleSettings,
  onHotspotClick,
  isBusy,
  busyLabel,
  extraToolbar,
  lookupDescription,
}) => {
  const stageRef = useRef(null);
  const { pdf, pageCount, isLoading, error } = usePDF(source, sourceKey);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState('width');
  const [hotspots, setHotspots] = useState([]);
  const [scan, setScan] = useState(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

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
  }, [fitMode, pageSize.width, pageSize.height, sourceKey, showPanel]);

  const handlePageChange = (value) => {
    if (!pageCount) return;
    const next = Math.min(pageCount, Math.max(1, Number(value) || 1));
    setPageNumber(next);
  };

  const handleHotspots = useCallback((spots, meta) => {
    setHotspots(spots);
    if (meta) setScan(meta);
  }, []);

  const scaleLabel = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

  return (
    <div className="viewer-shell d-flex flex-column min-h-0 flex-grow-1">
      <Toolbar
        title={title}
        canGoBack={canGoBack}
        onBack={onBack}
        onBrowseFiles={onBrowseFiles}
        pageNumber={pageNumber}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        scaleLabel={scaleLabel}
        onZoomIn={() => zoomBy(BUTTON_ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
        fitMode={fitMode}
        onFitWidth={() => setFitMode('width')}
        onFitPage={() => setFitMode('page')}
        hotspotCount={hotspots.length}
        panelOpen={showPanel}
        onTogglePanel={onTogglePanel}
        settingsOpen={settingsOpen}
        onToggleSettings={onToggleSettings}
      />
      {extraToolbar}

      <div className="viewer-body d-flex flex-grow-1 min-h-0">
        {showPanel ? (
          <HotspotPanel
            hotspots={hotspots}
            scan={scan}
            onSelect={onHotspotClick}
            disabled={isBusy}
            lookupDescription={lookupDescription}
          />
        ) : null}

        <div className="viewer-stage flex-grow-1 min-w-0 min-h-0" ref={stageRef}>
          {isLoading ? (
            <div className="d-flex align-items-center justify-content-center h-100">
              <Spinner label="Opening drawing…" />
            </div>
          ) : null}

          {error ? (
            <EmptyState
              icon="warning"
              title="This PDF could not be opened"
              body={error.message}
            />
          ) : null}

          {pdf && !error ? (
            <CanvasPage
              pdf={pdf}
              pageNumber={pageNumber}
              scale={scale}
              codeRegex={codeRegex}
              onHotspots={handleHotspots}
              onSelectHotspot={onHotspotClick}
              isBusy={isBusy}
              busyLabel={busyLabel}
              lookupDescription={lookupDescription}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
