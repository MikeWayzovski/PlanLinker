/** Default AECO drawing-code patterns: DET-01, DETAIL-12, ST-102, D-3. */
export const DEFAULT_CODE_REGEX = String.raw`(?:DET(?:AIL)?|ST|D)[-./\s]?\d+`;

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

const fontSizeOf = (item) => {
  const tx = item?.transform || [1, 0, 0, 1, 0, 0];
  return item?.height || Math.hypot(tx[2], tx[3]) || 10;
};

/**
 * Convert a PDF.js text item (and optional substring range) into viewport CSS pixels.
 */
export const itemToViewportRect = (item, viewport, start = 0, length = itemString(item).length) => {
  const text = itemString(item);
  const tx = item.transform || [1, 0, 0, 1, 0, 0];
  const fontHeight = fontSizeOf(item);
  const originX = tx[4];
  const originY = tx[5];
  const fullWidth = item.width || 0;
  const ratioStart = text.length ? start / text.length : 0;
  const ratioLength = text.length ? Math.max(length, 1) / text.length : 1;
  const x0 = originX + fullWidth * ratioStart;
  const x1 = x0 + fullWidth * ratioLength;
  const y0 = originY;
  const y1 = originY + fontHeight;

  let left;
  let top;
  let width;
  let height;

  if (typeof viewport.convertToViewportRectangle === 'function') {
    const vr = viewport.convertToViewportRectangle([x0, y0, x1, y1]);
    left = Math.min(vr[0], vr[2]);
    top = Math.min(vr[1], vr[3]);
    width = Math.abs(vr[2] - vr[0]);
    height = Math.abs(vr[3] - vr[1]);
  } else {
    const [vx0, vy0] = viewport.convertToViewportPoint(x0, originY);
    const [vx1, vy1] = viewport.convertToViewportPoint(x1, originY - fontHeight);
    left = Math.min(vx0, vx1);
    top = Math.min(vy0, vy1);
    width = Math.abs(vx1 - vx0);
    height = Math.abs(vy1 - vy0);
  }

  return {
    left,
    top,
    width: Math.max(width, 12),
    height: Math.max(height, 10),
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
    const tolerance = Math.max(box.rect.height, 8) * 0.65;
    const current = lines[lines.length - 1];
    const canJoin =
      current &&
      !current.boxes[current.boxes.length - 1]?.hasEOL &&
      Math.abs(current.midY - box.midY) <= Math.max(tolerance, current.height * 0.65);

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

const rectsForMatch = (map, start, length, viewport) => {
  const slice = map.slice(start, start + Math.max(length, 1)).filter((entry) => entry && !entry.space);
  if (!slice.length) return itemToViewportRect(map[start]?.item || {}, viewport);

  const groups = [];
  slice.forEach((entry) => {
    const current = groups[groups.length - 1];
    if (current && current.item === entry.item) {
      current.length += 1;
    } else {
      groups.push({ item: entry.item, start: Math.max(entry.offset, 0), length: 1 });
    }
  });

  return unionRects(
    groups.map((group) => itemToViewportRect(group.item, viewport, group.start, group.length)),
  );
};

const normalizeCode = (raw) => {
  const upper = String(raw)
    .toUpperCase()
    .replace(UNICODE_HYPHEN, '-')
    .replace(/[\s./]+/g, '-')
    .replace(/-+/g, '-');
  return upper.replace(/^([A-Z]+)(\d+)/, '$1-$2').replace(/^-|-$/g, '');
};

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
    const joined = joinBoxes(line.boxes);
    addMatches(hotspots, joined, regexSource, viewport, pageNumber, `line:${lineIndex}`);
    addMatches(hotspots, compactJoin(joined), regexSource, viewport, pageNumber, `compact:${lineIndex}`);
  });

  if (boxes.length) {
    const pageJoined = joinBoxes([...boxes].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left));
    addMatches(hotspots, compactJoin(pageJoined), regexSource, viewport, pageNumber, 'page');
  }

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
