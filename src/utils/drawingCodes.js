/** Default AECO drawing-code patterns: DET-01, DETAIL-12, D-3. */
export const DEFAULT_CODE_REGEX = String.raw`(?:DET(?:AIL)?|D)-\d+`;

export const compileCodeRegex = (source) => {
  const pattern = String(source || '').trim() || DEFAULT_CODE_REGEX;
  try {
    return new RegExp(pattern, 'gi');
  } catch {
    return new RegExp(DEFAULT_CODE_REGEX, 'gi');
  }
};

const itemString = (item) => String(item?.str || '');

/**
 * Convert a PDF.js text item (and optional substring range) into viewport CSS pixels.
 */
export const itemToViewportRect = (item, viewport, start = 0, length = itemString(item).length) => {
  const text = itemString(item);
  const tx = item.transform || [1, 0, 0, 1, 0, 0];
  const fontHeight = Math.hypot(tx[2], tx[3]) || item.height || 10;
  const originX = tx[4];
  const originY = tx[5];
  const fullWidth = item.width || 0;
  const ratioStart = text.length ? start / text.length : 0;
  const ratioLength = text.length ? Math.max(length, 1) / text.length : 1;
  const x0 = originX + fullWidth * ratioStart;
  const x1 = x0 + fullWidth * ratioLength;

  const [vx0, vy0] = viewport.convertToViewportPoint(x0, originY);
  const [vx1, vy1] = viewport.convertToViewportPoint(x1, originY - fontHeight);

  const left = Math.min(vx0, vx1);
  const top = Math.min(vy0, vy1);
  const width = Math.max(Math.abs(vx1 - vx0), 12);
  const height = Math.max(Math.abs(vy1 - vy0), 10);

  return {
    left,
    top,
    width,
    height,
  };
};

const pushHotspot = (hotspots, { code, item, viewport, start, length, pageNumber }) => {
  const key = `${pageNumber}:${code}:${item.transform?.[4]}:${item.transform?.[5]}:${start}`;
  if (hotspots.some((entry) => entry.key === key)) return;
  hotspots.push({
    key,
    code: String(code).toUpperCase(),
    pageNumber,
    rect: itemToViewportRect(item, viewport, start, length),
  });
};

/**
 * Detect drawing codes in a PDF.js text-content item list and return clickable hotspot boxes.
 */
export const findHotspots = (textContent, viewport, regexSource, pageNumber = 1) => {
  const regex = compileCodeRegex(regexSource);
  const items = (textContent?.items || []).filter((item) => itemString(item).trim());
  const hotspots = [];

  items.forEach((item) => {
    const text = itemString(item);
    regex.lastIndex = 0;
    let match = regex.exec(text);
    while (match) {
      pushHotspot(hotspots, {
        code: match[0],
        item,
        viewport,
        start: match.index,
        length: match[0].length,
        pageNumber,
      });
      if (!regex.global) break;
      match = regex.exec(text);
    }
  });

  // Join same-line fragments so split codes like "DET-" + "02" still match.
  const lineGroups = [];
  items.forEach((item) => {
    const y = Math.round(item.transform?.[5] || 0);
    const line = lineGroups.find((group) => Math.abs(group.y - y) < 2);
    if (line) line.items.push(item);
    else lineGroups.push({ y, items: [item] });
  });

  lineGroups.forEach((group) => {
    const joined = group.items.map(itemString).join('');
    regex.lastIndex = 0;
    let match = regex.exec(joined);
    while (match) {
      const already = hotspots.some(
        (entry) => entry.code === String(match[0]).toUpperCase() && entry.pageNumber === pageNumber,
      );
      if (!already) {
        const host = group.items.find((item) => itemString(item).includes(match[0])) || group.items[0];
        pushHotspot(hotspots, {
          code: match[0],
          item: host,
          viewport,
          start: 0,
          length: itemString(host).length,
          pageNumber,
        });
      }
      if (!regex.global) break;
      match = regex.exec(joined);
    }
  });

  return hotspots.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
};

export const uniqueCodes = (hotspots) =>
  [...new Set((hotspots || []).map((spot) => spot.code))].sort();
