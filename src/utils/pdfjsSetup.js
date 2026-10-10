import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Point the worker at the Vite-emitted module and give getDocument a directory
 * URL (trailing slash) for the wasm / cmap / font files copied into /public.
 * Without wasmUrl, PDF.js 5+ logs JBig2/OpenJPEG "failed to initialize" and
 * tries `nulljbig2_nowasm_fallback.js`.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const publicBase = () => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
};

export const pdfAssetUrls = () => {
  const base = publicBase();
  return {
    wasmUrl: `${base}pdfjs-wasm/`,
    cMapUrl: `${base}pdfjs-cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}pdfjs-standard_fonts/`,
  };
};

export const openPdfDocument = (source) => {
  const extras = pdfAssetUrls();
  if (!source) {
    throw new Error('No PDF source was provided.');
  }
  if (typeof source === 'string') {
    return pdfjsLib.getDocument({ url: source, ...extras });
  }
  if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
    return pdfjsLib.getDocument({ data: source, ...extras });
  }
  return pdfjsLib.getDocument({ ...source, ...extras });
};

export { pdfjsLib };
