import { useEffect, useState } from 'react';
import { openPdfDocument, pdfjsLib } from '../utils/pdfjsSetup';
import { Logger } from '../utils/logger';

/**
 * Load a PDF.js document from a blob, ArrayBuffer, or URL.
 * `sourceKey` must change when the file changes (file id or object URL).
 */
export const usePDF = (source, sourceKey = '') => {
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!source) return undefined;

    let cancelled = false;
    let loadingTask = null;
    let pdfDocument = null;
    let destroyed = false;

    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      if (pdfDocument) {
        pdfDocument.destroy();
        pdfDocument = null;
        return;
      }
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        loadingTask = openPdfDocument(source);
        pdfDocument = await loadingTask.promise;
        if (cancelled) {
          destroy();
          return;
        }
        setPdf(pdfDocument);
        setPageCount(pdfDocument.numPages);
      } catch (loadError) {
        Logger.error('Could not open the PDF', loadError.message);
        if (!cancelled) {
          setPdf(null);
          setPageCount(0);
          setError(loadError);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      destroy();
    };
  }, [source, sourceKey]);

  return { pdf, pageCount, isLoading, error };
};

export { pdfjsLib };
