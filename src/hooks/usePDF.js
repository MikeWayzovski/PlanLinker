import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Logger } from '../utils/logger';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        loadingTask = pdfjsLib.getDocument(source);
        const document = await loadingTask.promise;
        if (cancelled) {
          document.destroy();
          return;
        }
        setPdf(document);
        setPageCount(document.numPages);
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
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [source, sourceKey]);

  return { pdf, pageCount, isLoading, error };
};

export { pdfjsLib };
