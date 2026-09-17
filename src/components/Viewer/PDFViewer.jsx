import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePDF } from '../../hooks/usePDF';
import Toolbar from './Toolbar';
import CanvasPage from './CanvasPage';
import HotspotPanel from './HotspotPanel';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';

const ZOOM_STEP = 1.2;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

const PDFViewer = ({
  source,
  sourceKey,
  title,
  canGoBack,
  onBack,
  codeRegex,
  showPanel,
  onTogglePanel,
  settingsOpen,
  onToggleSettings,
  onHotspotClick,
  isBusy,
  busyLabel,
  extraToolbar,
}) => {
  const stageRef = useRef(null);
  const { pdf, pageCount, isLoading, error } = usePDF(source, sourceKey);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [hotspots, setHotspots] = useState([]);
  const [baseWidth, setBaseWidth] = useState(0);

  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;
    pdf.getPage(1).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      setBaseWidth(viewport.width);
    });

    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useEffect(() => {
    if (!fitWidth || !baseWidth) return undefined;
    const node = stageRef.current;
    if (!node) return undefined;

    const apply = (width) => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (width - 32) / baseWidth));
      setScale(Number(next.toFixed(3)));
    };

    apply(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) apply(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fitWidth, baseWidth, sourceKey]);

  const handlePageChange = (value) => {
    if (!pageCount) return;
    const next = Math.min(pageCount, Math.max(1, Number(value) || 1));
    setPageNumber(next);
  };

  const handleHotspots = useCallback((spots) => {
    setHotspots(spots);
  }, []);

  const scaleLabel = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

  return (
    <div className="viewer-shell d-flex flex-column min-h-0 flex-grow-1">
      <Toolbar
        title={title}
        canGoBack={canGoBack}
        onBack={onBack}
        pageNumber={pageNumber}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        scaleLabel={scaleLabel}
        onZoomIn={() => {
          setFitWidth(false);
          setScale((current) => Math.min(MAX_SCALE, current * ZOOM_STEP));
        }}
        onZoomOut={() => {
          setFitWidth(false);
          setScale((current) => Math.max(MIN_SCALE, current / ZOOM_STEP));
        }}
        onFitWidth={() => setFitWidth(true)}
        hotspotCount={hotspots.length}
        panelOpen={showPanel}
        onTogglePanel={onTogglePanel}
        settingsOpen={settingsOpen}
        onToggleSettings={onToggleSettings}
      />
      {extraToolbar}

      <div className="d-flex flex-grow-1 min-h-0">
        {showPanel ? (
          <HotspotPanel hotspots={hotspots} onSelect={onHotspotClick} disabled={isBusy} />
        ) : null}

        <div className="flex-grow-1 min-w-0 min-h-0 viewer-stage" ref={stageRef}>
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
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
