/** Default AECO drawing-code patterns: DET-01, ST-102, UO101, UO.300, D-3. */
export const DEFAULT_CODE_REGEX = String.raw`(?:DET(?:AIL)?|ST|D|[A-Z]{2,4})[-./\s]?\d+`;

const UNICODE_HYPHEN = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

export const normalizeRegexSource = (source) => {
  let pattern = String(source || '').trim();
  const wrapped = pattern.match(/^\/([\s\S]+)\/([gimsuy]*)$/);
  if (wrapped) pattern = wrapped[1];
  return pattern || DEFAULT_CODE_REGEX;
};

export const compileCodeRegex = (source) => {
  const pattern = normalizeRegexSource(source);
  try {
    return new RegExp(pattern, 'gi');
  } catch {
    return new RegExp(DEFAULT_CODE_REGEX, 'gi');
  }
};

const itemString = (item) =>
  String(item?.str || '')
    .replace(UNICODE_HYPHEN, '-')
    .replace(/\u00a0/g, ' ');

/** Concatenate PDF transforms: apply `second`, then `first` (same as pdf.js `Util.transform`). */
const multiplyTransform = (first, second) => [
  first[0] * second[0] + first[2] * second[1],
  first[1] * second[0] + first[3] * second[1],
  first[0] * second[2] + first[2] * second[3],
  first[1] * second[2] + first[3] * second[3],
  first[0] * second[4] + first[2] * second[5] + first[4],
  first[1] * second[4] + first[3] * second[5] + first[5],
];

const aabbFromPoints = (points) => {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left,
    top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
};

const applyTextMatrix = (tx, x, y) => [
  tx[0] * x + tx[2] * y + tx[4],
  tx[1] * x + tx[3] * y + tx[5],
];

const coversWholeItem = (spanStart, spanLength, charCount) =>
  spanStart === 0 && spanLength >= Math.max(1, Math.ceil(charCount * 0.85));

/**
 * Convert a PDF.js text item (and optional substring range) into viewport CSS pixels.
 *
 * Drawing codes are usually the entire text item. In that case use the item
 * transform + PDF.js advance (`item.width`) with no character offset — a linear
 * `runWidth * ratioStart` shift misses proportional fonts and slides the box.
 * Substrings walk 0.5em steps through the same matrix so zoom stays aligned.
 */
export const itemToViewportRect = (item, viewport, start = 0, length = itemString(item).length) => {
  const text = itemString(item);
  const src = item.transform || [1, 0, 0, 1, 0, 0];
  const vp = viewport?.transform || [1, 0, 0, 1, 0, 0];
  const tx = multiplyTransform(vp, src);

  const fontHeight = Math.hypot(tx[2], tx[3]) || 8;
  const runScale = Math.hypot(tx[0], tx[1]) || 1;
  const srcScale = Math.hypot(src[0], src[1]) || 1;
  const charCount = Math.max(text.length, 1);
  const spanStart = Math.min(Math.max(Number(start) || 0, 0), charCount - 1);
  const spanLength = Math.min(Math.max(Number(length) || charCount, 1), charCount - spanStart);

  let box;
  if (coversWholeItem(spanStart, spanLength, charCount)) {
    let advance = Number(item.width) || 0;
    if (advance > 0) advance *= runScale / srcScale;
    if (advance < fontHeight * 0.3) advance = fontHeight * 0.5 * charCount;

    const angle = Math.atan2(tx[1], tx[0]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const originX = tx[4];
    const originY = tx[5];
    box = aabbFromPoints([
      [originX, originY],
      [originX + advance * cos, originY + advance * sin],
      [originX + tx[2], originY + tx[3]],
      [originX + advance * cos + tx[2], originY + advance * sin + tx[3]],
    ]);
  } else {
    const em = 0.5;
    const x0 = spanStart * em;
    const x1 = (spanStart + spanLength) * em;
    box = aabbFromPoints([
      applyTextMatrix(tx, x0, 0),
      applyTextMatrix(tx, x1, 0),
      applyTextMatrix(tx, x0, 1),
      applyTextMatrix(tx, x1, 1),
    ]);
  }

  return {
    left: box.left,
    top: box.top,
    width: Math.max(box.width, 8),
    height: Math.max(Math.min(box.height, fontHeight * 1.4), 8),
  };
};

const unionRects = (rects) => {
  if (!rects.length) return { left: 0, top: 0, width: 12, height: 10 };
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));
  return {
    left,
    top,
    width: Math.max(right - left, 12),
    height: Math.max(bottom - top, 10),
  };
};

const collectTextItems = (textContent) =>
  (textContent?.items || []).filter((item) => item && typeof item.str === 'string' && itemString(item).length);

const itemViewportBox = (item, viewport) => {
  const rect = itemToViewportRect(item, viewport);
  return {
    item,
    text: itemString(item),
    rect,
    midY: rect.top + rect.height / 2,
    hasEOL: Boolean(item.hasEOL),
  };
};

const clusterLines = (boxes) => {
  const sorted = [...boxes].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  const lines = [];

  sorted.forEach((box) => {
    const lineHeight = Math.min(Math.max(box.rect.height, 8), 28);
    const tolerance = lineHeight * 0.65;
    const current = lines[lines.length - 1];
    const canJoin =
      current &&
      !current.boxes[current.boxes.length - 1]?.hasEOL &&
      Math.abs(current.midY - box.midY) <= Math.max(tolerance, Math.min(current.height, 28) * 0.65);

    if (canJoin) {
      current.boxes.push(box);
      const tops = current.boxes.map((entry) => entry.rect.top);
      const bottoms = current.boxes.map((entry) => entry.rect.top + entry.rect.height);
      current.midY = (Math.min(...tops) + Math.max(...bottoms)) / 2;
      current.height = Math.max(current.height, box.rect.height);
    } else {
      lines.push({
        midY: box.midY,
        height: box.rect.height,
        boxes: [box],
      });
    }
  });

  lines.forEach((line) => {
    line.boxes.sort((a, b) => a.rect.left - b.rect.left);
  });
  return lines;
};

/** Keep only items that sit next to each other so a title-block row is not one giant run. */
const splitVisualRuns = (boxes) => {
  const runs = [];
  boxes.forEach((box) => {
    const current = runs[runs.length - 1];
    const prev = current?.[current.length - 1];
    const gap = prev ? box.rect.left - (prev.rect.left + prev.rect.width) : 0;
    const limit = Math.max(box.rect.height, prev?.rect.height || 8, 8) * 2.8;
    if (current && gap <= limit) {
      current.push(box);
    } else {
      runs.push([box]);
    }
  });
  return runs;
};

const joinBoxes = (boxes) => {
  let text = '';
  const map = [];

  boxes.forEach((box, index) => {
    const prev = boxes[index - 1];
    if (prev) {
      const gap = box.rect.left - (prev.rect.left + prev.rect.width);
      const spaceWidth = Math.max(prev.rect.width / Math.max(prev.text.length, 1), 2) * 0.45;
      if (gap > spaceWidth) {
        text += ' ';
        map.push({ item: box.item, offset: -1, space: true });
      }
    }

    for (let indexInItem = 0; indexInItem < box.text.length; indexInItem += 1) {
      text += box.text[indexInItem];
      map.push({ item: box.item, offset: indexInItem, space: false });
    }
  });

  return { text, map };
};

const compactJoin = (joined) => {
  const textChars = [];
  const map = [];
  for (let index = 0; index < joined.text.length; index += 1) {
    const entry = joined.map[index];
    const char = joined.text[index];
    if (entry?.space || /\s/.test(char)) continue;
    textChars.push(char);
    map.push(entry);
  }
  return { text: textChars.join(''), map };
};

const matchAllSafe = (text, regex) => {
  const compiled = compileCodeRegex(regex);
  compiled.lastIndex = 0;
  const matches = [];
  let match = compiled.exec(text);
  let guard = 0;
  while (match && guard < 5000) {
    guard += 1;
    if (!match[0]) {
      compiled.lastIndex += 1;
      match = compiled.exec(text);
      continue;
    }
    matches.push(match);
    if (!compiled.global) break;
    match = compiled.exec(text);
  }
  return matches;
};

const expectedCodeWidth = (rects, matchLength) => {
  const font = Math.max(...rects.map((rect) => rect.height), 8);
  return font * Math.max(matchLength, 1) * 0.85;
};

const unionNearbyRects = (rects) => {
  if (rects.length <= 1) return rects;
  const clusters = [];
  rects.forEach((rect) => {
    const last = clusters[clusters.length - 1];
    if (!last) {
      clusters.push(rect);
      return;
    }
    const gap = rect.left - (last.left + last.width);
    const limit = Math.max(last.height, rect.height, 8) * 2.2;
    if (gap <= limit) {
      clusters[clusters.length - 1] = unionRects([last, rect]);
    } else {
      clusters.push(rect);
    }
  });
  return clusters;
};

/**
 * Box for a regex match: only the mapped substring of that line/run, never a
 * page-wide union of distant items that happened to sit on the same Y.
 */
const rectsForMatch = (map, start, length, viewport) => {
  const matchLength = Math.max(length, 1);
  const slice = map.slice(start, start + matchLength).filter((entry) => entry && !entry.space);
  if (!slice.length) {
    const fallback = map[start];
    if (!fallback?.item) return { left: 0, top: 0, width: 12, height: 10 };
    return itemToViewportRect(fallback.item, viewport, Math.max(fallback.offset, 0), 1);
  }

  const groups = [];
  slice.forEach((entry) => {
    const current = groups[groups.length - 1];
    const offset = Math.max(entry.offset, 0);
    if (current && current.item === entry.item) {
      current.end = Math.max(current.end, offset);
    } else {
      groups.push({ item: entry.item, start: offset, end: offset });
    }
  });

  const rects = groups.map((group) =>
    itemToViewportRect(group.item, viewport, group.start, group.end - group.start + 1),
  );

  if (groups.length === 1) {
    const group = groups[0];
    const chars = Math.max(itemString(group.item).length, 1);
    if (coversWholeItem(group.start, group.end - group.start + 1, chars)) {
      return rects[0];
    }
  }

  const nearby = unionNearbyRects(rects);
  const expected = expectedCodeWidth(rects, matchLength);
  const chosen =
    nearby.find((rect) => rect.width <= expected * 1.6) ||
    nearby.reduce((smallest, rect) => (rect.width < smallest.width ? rect : smallest), nearby[0]);

  return {
    ...chosen,
    width: Math.min(chosen.width, Math.max(expected * 1.35, chosen.height * 0.5 * matchLength)),
  };
};

export const normalizeDrawingCode = (raw) => {
  const upper = String(raw)
    .toUpperCase()
    .replace(UNICODE_HYPHEN, '-')
    .replace(/[\s./]+/g, '-')
    .replace(/-+/g, '-');
  return upper.replace(/^([A-Z]+)(\d+)/, '$1-$2').replace(/^-|-$/g, '');
};

const normalizeCode = normalizeDrawingCode;

const pushHotspot = (hotspots, { code, pageNumber, rect, keyParts }) => {
  const normalized = normalizeCode(code);
  if (!normalized) return;
  const key = `${pageNumber}:${normalized}:${keyParts}`;
  const duplicate = hotspots.some(
    (entry) =>
      entry.code === normalized &&
      Math.abs(entry.rect.left - rect.left) < 10 &&
      Math.abs(entry.rect.top - rect.top) < 10,
  );
  if (duplicate || hotspots.some((entry) => entry.key === key)) return;
  hotspots.push({
    key,
    code: normalized,
    pageNumber,
    rect,
  });
};

const addMatches = (hotspots, joined, regexSource, viewport, pageNumber, keyPrefix) => {
  matchAllSafe(joined.text, regexSource).forEach((match) => {
    pushHotspot(hotspots, {
      code: match[0],
      pageNumber,
      rect: rectsForMatch(joined.map, match.index, match[0].length, viewport),
      keyParts: `${keyPrefix}:${Math.round(match.index)}`,
    });
  });
};

/**
 * Detect drawing codes in a PDF.js text-content item list and return clickable hotspot boxes.
 */
export const scanPageCodes = (textContent, viewport, regexSource, pageNumber = 1) => {
  const items = collectTextItems(textContent);
  const boxes = items.map((item) => itemViewportBox(item, viewport));
  const lines = clusterLines(boxes);
  const hotspots = [];

  lines.forEach((line, lineIndex) => {
    splitVisualRuns(line.boxes).forEach((run, runIndex) => {
      const joined = joinBoxes(run);
      addMatches(hotspots, joined, regexSource, viewport, pageNumber, `line:${lineIndex}:${runIndex}`);
      addMatches(hotspots, compactJoin(joined), regexSource, viewport, pageNumber, `compact:${lineIndex}:${runIndex}`);
    });
  });

  const sample = lines
    .map((line) => joinBoxes(line.boxes).text.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(' · ');

  return {
    hotspots: hotspots.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left),
    meta: {
      itemCount: items.length,
      lineCount: lines.length,
      sample: sample.slice(0, 280),
    },
  };
};

export const findHotspots = (textContent, viewport, regexSource, pageNumber = 1) =>
  scanPageCodes(textContent, viewport, regexSource, pageNumber).hotspots;

export const uniqueCodes = (hotspots) =>
  [...new Set((hotspots || []).map((spot) => spot.code))].sort();
