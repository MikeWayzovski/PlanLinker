export const LAYER_COLORS = [
  '#6B4EAA',
  '#2E7D32',
  '#C62828',
  '#0288D1',
  '#F9A825',
  '#E65100',
];

export const TEMPLATE_LAYERS = [
  { id: 'background', name: 'Background', color: LAYER_COLORS[0], nested: false },
  { id: 'annotations', name: 'Annotations', color: LAYER_COLORS[1], nested: true },
  { id: 'shapes', name: 'Shapes', color: LAYER_COLORS[2], nested: true },
  { id: 'text', name: 'Text', color: LAYER_COLORS[3], nested: true },
  { id: 'guides', name: 'Guides', color: LAYER_COLORS[4], nested: true },
  { id: 'grid', name: 'Grid', color: LAYER_COLORS[5], nested: true },
];
