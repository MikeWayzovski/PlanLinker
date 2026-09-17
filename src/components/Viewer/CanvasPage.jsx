import React, { useEffect, useRef, useState } from 'react';
import { findHotspots } from '../../utils/drawingCodes';
import { Logger } from '../../utils/logger';
import HotspotOverlay from './HotspotOverlay';
import Spinner from '../Modus/Spinner';

const CanvasPage = ({
  pdf,
  pageNumber,
  scale,
  codeRegex,
  onHotspots,
  onSelectHotspot,
  isBusy,
  busyLabel,
}) => {
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pageHotspots, setPageHotspots] = useState([]);

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
        await renderTask.promise;
        if (cancelled) return;

        const textContent = await page.getTextContent();
        if (cancelled) return;

        const spots = findHotspots(textContent, viewport, codeRegex, pageNumber);
        setPageHotspots(spots);
        onHotspots(spots);
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
  }, [pdf, pageNumber, scale, codeRegex, onHotspots]);

  return (
    <div className="canvas-stage">
      <div className="canvas-sheet">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <HotspotOverlay
          hotspots={pageHotspots}
          canvasWidth={size.width}
          canvasHeight={size.height}
          onSelect={onSelectHotspot}
          disabled={isBusy}
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
