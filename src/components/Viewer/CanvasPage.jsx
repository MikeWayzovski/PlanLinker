import React, { useEffect, useRef, useState } from 'react';
import { scanPageCodes } from '../../utils/drawingCodes';
import { Logger } from '../../utils/logger';
import HotspotOverlay from './HotspotOverlay';
import Spinner from '../Modus/Spinner';

const emptyMeta = { itemCount: 0, lineCount: 0, sample: '' };
const LOW_MEMORY_MAX_RENDER_SCALE = 1.5;
const SCAN_DEBOUNCE_MS = 140;
const SCAN_DEBOUNCE_LOW_MS = 280;
const RENDER_DEBOUNCE_LOW_MS = 220;

const releaseCanvas = (canvas) => {
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: false });
  if (context) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;
};

const releasePage = (page) => {
  try {
    page?.cleanup?.();
  } catch {
    // PDF.js may already have torn the page down.
  }
};

const CanvasPage = ({
  pdf,
  pageNumber,
  scale,
  codeRegex,
  onHotspots,
  onSelectHotspot,
  onInspectHotspot,
  selectedKey,
  isBusy,
  busyLabel,
  lookupDescription,
  showCanvas = true,
  showHotspots = true,
  interactionMode = 'select',
  onRendered,
  lowMemoryMode = false,
  scanPaused = false,
}) => {
  const canvasRef = useRef(null);
  const scanPausedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pageHotspots, setPageHotspots] = useState([]);
  const [textScan, setTextScan] = useState(null);

  useEffect(() => {
    scanPausedRef.current = scanPaused;
  }, [scanPaused]);

  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;
    let page = null;

    const loadText = async () => {
      try {
        page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const content = await page.getTextContent({ disableNormalization: false });
        if (cancelled) return;
        setTextScan({ pageNumber, content });
        if (lowMemoryMode) releasePage(page);
      } catch (error) {
        Logger.error('Could not read PDF text', error.message);
        if (!cancelled) setTextScan({ pageNumber, content: { items: [] } });
      }
    };

    loadText();
    return () => {
      cancelled = true;
      if (lowMemoryMode) releasePage(page);
    };
  }, [pdf, pageNumber, lowMemoryMode]);

  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;
    let renderTask = null;
    let page = null;
    let timer = 0;

    const render = async () => {
      try {
        page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const visualScale = scale;
        const renderScale = lowMemoryMode ? Math.min(visualScale, LOW_MEMORY_MAX_RENDER_SCALE) : visualScale;
        const visualViewport = page.getViewport({ scale: visualScale });
        const renderViewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        setSize({ width: visualViewport.width, height: visualViewport.height });
        canvas.style.width = `${Math.floor(visualViewport.width)}px`;
        canvas.style.height = `${Math.floor(visualViewport.height)}px`;

        if (!showCanvas) {
          releaseCanvas(canvas);
          canvas.style.width = `${Math.floor(visualViewport.width)}px`;
          canvas.style.height = `${Math.floor(visualViewport.height)}px`;
          requestAnimationFrame(() => {
            if (!cancelled) onRendered?.({ width: visualViewport.width, height: visualViewport.height });
          });
          if (lowMemoryMode) releasePage(page);
          return;
        }

        const outputScale = lowMemoryMode ? 1 : window.devicePixelRatio || 1;
        const context = canvas.getContext('2d', { alpha: false });
        canvas.width = Math.floor(renderViewport.width * outputScale);
        canvas.height = Math.floor(renderViewport.height * outputScale);

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        renderTask = page.render({ canvasContext: context, canvas, viewport: renderViewport, transform });
        requestAnimationFrame(() => {
          if (!cancelled) onRendered?.({ width: visualViewport.width, height: visualViewport.height });
        });
        await renderTask.promise;
        if (lowMemoryMode && !cancelled) releasePage(page);
      } catch (error) {
        if (error?.name === 'RenderingCancelledException') return;
        Logger.error('Could not render the PDF page', error.message);
      }
    };

    const canvas = canvasRef.current;
    const delay = lowMemoryMode ? RENDER_DEBOUNCE_LOW_MS : 0;
    if (delay) {
      timer = window.setTimeout(render, delay);
    } else {
      render();
    }

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (renderTask) renderTask.cancel();
      if (lowMemoryMode) {
        releaseCanvas(canvas);
        releasePage(page);
      }
    };
  }, [pdf, pageNumber, scale, showCanvas, lowMemoryMode, onRendered]);

  useEffect(() => {
    if (!pdf || !textScan || textScan.pageNumber !== pageNumber) return undefined;

    let cancelled = false;
    let page = null;
    let timer = 0;
    const delay = lowMemoryMode ? SCAN_DEBOUNCE_LOW_MS : SCAN_DEBOUNCE_MS;

    const detect = async () => {
      if (cancelled) return;
      if (scanPausedRef.current) {
        timer = window.setTimeout(detect, delay);
        return;
      }
      try {
        page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const { hotspots, meta } = scanPageCodes(textScan.content, viewport, codeRegex, pageNumber);
        if (cancelled) return;
        setPageHotspots(hotspots);
        onHotspots(hotspots, meta);
        Logger.info(
          `Page ${pageNumber}: ${meta.itemCount} text item(s), ${meta.lineCount} line(s), ${hotspots.length} hotspot(s).`,
          meta.sample,
        );
        if (lowMemoryMode) releasePage(page);
      } catch (error) {
        Logger.error('Could not detect drawing codes', error.message);
        if (!cancelled) {
          setPageHotspots([]);
          onHotspots([], emptyMeta);
        }
      }
    };

    timer = window.setTimeout(detect, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (lowMemoryMode) releasePage(page);
    };
  }, [pdf, pageNumber, scale, codeRegex, textScan, onHotspots, lowMemoryMode]);

  const capturePointer = interactionMode === 'pan' || interactionMode === 'boxzoom';

  return (
    <div className={`canvas-stage${capturePointer ? ' canvas-stage-pan' : ''}`}>
      <div className="canvas-sheet">
        <canvas ref={canvasRef} className={`pdf-canvas${showCanvas ? '' : ' pdf-canvas-hidden'}`} />
        <HotspotOverlay
          hotspots={pageHotspots}
          canvasWidth={size.width}
          canvasHeight={size.height}
          onSelect={onSelectHotspot}
          onInspect={onInspectHotspot}
          disabled={isBusy || capturePointer}
          lookupDescription={lookupDescription}
          visible={showHotspots}
          selectedKey={selectedKey}
        />
        {isBusy ? (
          <div className="canvas-loading" role="status" aria-live="polite">
            <Spinner label={busyLabel || 'Looking up drawing…'} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CanvasPage;
