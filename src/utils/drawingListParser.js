import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizeDrawingCode } from './drawingCodes';
import { Logger } from './logger';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

const MAX_PAGES = 40;
const UNICODE_HYPHEN = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

/** Drawing codes typical of AECO lists: UO101, UO.300, DET-01, ST-102. */
export const LIST_CODE_PATTERN = /(?:DET(?:AIL)?|ST|D|[A-Z]{2,4})[-./\s]?\d+[A-Z]?/gi;

export const INDEX_FILE_PATTERN = /(lijst|register|drawing\s*list|index)/i;

const HEADER_OR_JUNK = /^(nr|no|nummer|code|tekening|tekeningnr|tekeningnummer|drawing|omschrijving|description|titel|title|blad|sheet|rev|revisie|datum|date|schaal|scale)$/i;

const indexCandidateScore = (name) => {
  const value = String(name || '').toLowerCase();
  if (/tekeningen?\s*lijst|tekeninglijst/.test(value)) return 0;
  if (value.includes('lijst')) return 1;
  if (/drawing\s*list/.test(value)) return 2;
  if (value.includes('register')) return 3;
  return 4;
};

export const isIndexCandidateFile = (file) => {
  const name = String(file?.name || '');
  return Boolean(name) && INDEX_FILE_PATTERN.test(name);
};

export const findIndexCandidate = (items, dismissedIds = []) => {
  const dismissed = new Set((dismissedIds || []).map(String));
  const matches = (items || []).filter(
    (item) =>
      item &&
      item.type !== 'FOLDER' &&
      String(item.name).toLowerCase().endsWith('.pdf') &&
      isIndexCandidateFile(item) &&
      !dismissed.has(String(item.id)),
  );
  matches.sort(
    (a, b) =>
      indexCandidateScore(a.name) - indexCandidateScore(b.name) ||
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }),
  );
  return matches[0] || null;
};

const codeRegex = () => new RegExp(LIST_CODE_PATTERN.source, 'i');

const compactKey = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const extractCodesFromText = (text) => {
  const source = String(text || '').replace(UNICODE_HYPHEN, '-');
  const matches = source.matchAll(new RegExp(LIST_CODE_PATTERN.source, 'gi'));
  return [...matches].map((match) => match[0]);
};

const addEntry = (map, code, description) => {
  const trimmed = String(description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  if (!trimmed || HEADER_OR_JUNK.test(trimmed)) return;
  const raw = String(code || '')
    .toUpperCase()
    .replace(UNICODE_HYPHEN, '-')
    .replace(/\s+/g, '')
    .trim();
  if (!raw || HEADER_OR_JUNK.test(raw)) return;
  const normalized = normalizeDrawingCode(raw);
  const compact = compactKey(raw);
  [raw, normalized, compact].filter(Boolean).forEach((key) => {
    if (!map[key]) map[key] = trimmed;
  });
};

const cleanDescription = (text) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+[A-Z]\s+\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s*$/i, '')
    .replace(/\s+\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s*$/, '')
    .trim();

const clusterRowsByY = (items) => {
  const boxes = (items || [])
    .filter((item) => item && typeof item.str === 'string' && item.str.trim())
    .map((item) => {
      const tx = item.transform || [1, 0, 0, 1, 0, 0];
      return {
        text: String(item.str)
          .replace(UNICODE_HYPHEN, '-')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        x: tx[4] || 0,
        y: tx[5] || 0,
        height: item.height || Math.abs(tx[3]) || 10,
      };
    })
    .filter((box) => box.text);

  boxes.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows = [];
  boxes.forEach((box) => {
    const current = rows[rows.length - 1];
    const tolerance = Math.max(box.height, 8) * 0.55;
    if (current && Math.abs(current.y - box.y) <= Math.max(tolerance, current.height * 0.55)) {
      current.items.push(box);
      const count = current.items.length;
      current.y = (current.y * (count - 1) + box.y) / count;
      current.height = Math.max(current.height, box.height);
    } else {
      rows.push({ y: box.y, height: box.height, items: [box] });
    }
  });

  rows.forEach((row) => {
    row.items.sort((a, b) => a.x - b.x);
  });
  return rows;
};

const splitLeadingCode = (texts) => {
  const pattern = codeRegex();
  for (let take = 1; take <= Math.min(4, texts.length); take += 1) {
    const candidate = texts.slice(0, take).join('').replace(/\s+/g, '');
    const match = candidate.match(pattern);
    if (match && match[0] && match.index === 0 && match[0].length === candidate.length) {
      return { code: match[0], rest: texts.slice(take) };
    }
  }

  const line = texts.join(' ');
  const start = line.match(new RegExp(`^(${LIST_CODE_PATTERN.source})\\b`, 'i'));
  if (start) {
    return { code: start[1], rest: [line.slice(start[0].length)] };
  }
  return null;
};

const parseRowIntoMap = (row, map) => {
  const texts = (row.items || []).map((item) => item.text).filter(Boolean);
  if (!texts.length) return;
  for (let start = 0; start < texts.length; start += 1) {
    const split = splitLeadingCode(texts.slice(start));
    if (!split) continue;
    const description = cleanDescription(split.rest.join(' '));
    if (!description || HEADER_OR_JUNK.test(description)) continue;
    addEntry(map, split.code, description);
    return;
  }
};

/**
 * Parse a drawing-list PDF into `{ drawingCode: description }` using the text layer.
 */
export const parseDrawingListPDF = async (pdfDocument) => {
  const map = {};
  try {
    const pageCount = Math.min(Number(pdfDocument?.numPages) || 0, MAX_PAGES);
    if (!pageCount) {
      Logger.warn('Could not parse table structures from drawing list: PDF has no pages');
      return map;
    }
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent({ disableNormalization: false });
      clusterRowsByY(content?.items || []).forEach((row) => parseRowIntoMap(row, map));
    }
    if (Object.keys(map).length === 0) {
      Logger.warn('Could not parse table structures from drawing list: no code/description rows found');
    }
    return map;
  } catch (error) {
    Logger.warn(`Could not parse table structures from drawing list: ${error.message}`);
    throw error;
  }
};

export const parseDrawingListBlob = async (blob) => {
  const data = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  try {
    return await parseDrawingListPDF(pdf);
  } finally {
    await pdf.destroy();
  }
};

export const descriptionForFile = (file, lookupDescription) => {
  if (!file || typeof lookupDescription !== 'function') return '';
  const name = String(file.name || '').replace(/\.pdf$/i, '');
  const path = String(file.path || '');
  const codes = extractCodesFromText(`${name} ${path}`);
  for (const code of codes) {
    const description = lookupDescription(code);
    if (description) return description;
  }
  return lookupDescription(name) || lookupDescription(compactKey(name)) || '';
};

const fileContainsCode = (file, code) => {
  const name = String(file?.name || '').toUpperCase();
  const compactName = compactKey(name);
  const raw = String(code || '').toUpperCase();
  const compact = compactKey(raw);
  return Boolean(raw) && (name.includes(raw) || (compact && compactName.includes(compact)));
};

export const fileMatchesSearch = (file, needle, lookupDescription, indexMap) => {
  const query = String(needle || '').trim().toLowerCase();
  if (!query) return true;
  const haystack = `${file?.name || ''} ${file?.path || ''}`.toLowerCase();
  if (haystack.includes(query)) return true;
  const description = descriptionForFile(file, lookupDescription);
  if (description.toLowerCase().includes(query)) return true;
  return Object.entries(indexMap || {}).some(([code, label]) => {
    if (!String(label).toLowerCase().includes(query)) return false;
    return fileContainsCode(file, code);
  });
};
