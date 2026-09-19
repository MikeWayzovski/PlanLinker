import React, { useEffect, useRef, useState } from 'react';
import { scanPageCodes } from '../../utils/drawingCodes';
import { Logger } from '../../utils/logger';
import HotspotOverlay from './HotspotOverlay';
import Spinner from '../Modus/Spinner';

const emptyMeta = { itemCount: 0, lineCount: 0, sample: '' };

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
}) => {
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pageHotspots, setPageHotspots] = useState([]);
  const [textScan, setTextScan] = useState(null);

  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;

    const loadText = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const content = await page.getTextContent({ disableNormalization: false });
        if (cancelled) return;
        setTextScan({ pageNumber, content });
      } catch (error) {
        Logger.error('Could not read PDF text', error.message);
        if (!cancelled) setTextScan({ pageNumber, content: { items: [] } });
      }
    };

    loadText();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;
    let renderTask = null;

    const render = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext('2d', { alpha: false });
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        setSize({ width: viewport.width, height: viewport.height });

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        renderTask = page.render({ canvasContext: context, canvas, viewport, transform });
        requestAnimationFrame(() => {
          if (!cancelled) onRendered?.({ width: viewport.width, height: viewport.height });
        });
        await renderTask.promise;
      } catch (error) {
        if (error?.name === 'RenderingCancelledException') return;
        Logger.error('Could not render the PDF page', error.message);
      }
    };

    render();

    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdf, pageNumber, scale, onRendered]);

  useEffect(() => {
    if (!pdf || !textScan || textScan.pageNumber !== pageNumber) return undefined;

    let cancelled = false;

    const detect = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
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
      } catch (error) {
        Logger.error('Could not detect drawing codes', error.message);
        if (!cancelled) {
          setPageHotspots([]);
          onHotspots([], emptyMeta);
        }
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale, codeRegex, textScan, onHotspots]);

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
