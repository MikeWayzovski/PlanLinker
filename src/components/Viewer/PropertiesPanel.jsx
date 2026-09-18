import React from 'react';
import {
  ModusWcButton,
  ModusWcIcon,
  ModusWcPanel,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import { LAYER_COLORS } from './layerColors';

const LAYER_OPTIONS = [{ value: 'annotations', label: 'Annotations' }];

const DIMENSION_ROWS = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'stroke', label: 'Stroke' },
  { key: 'opacity', label: 'Opacity' },
];

const PropertiesPanel = ({ inspectSpot, pageSize, onClose }) => {
  const x = inspectSpot?.rect?.left != null ? String(Math.round(inspectSpot.rect.left)) : '100';
  const y = inspectSpot?.rect?.top != null ? String(Math.round(inspectSpot.rect.top)) : '200';
  const dimensions = {
    width: inspectSpot?.rect?.width != null ? `${Math.round(inspectSpot.rect.width)} px` : pageSize?.width ? `${Math.round(pageSize.width)} px` : '150 px',
    height: inspectSpot?.rect?.height != null ? `${Math.round(inspectSpot.rect.height)} px` : pageSize?.height ? `${Math.round(pageSize.height)} px` : '80 px',
    stroke: '2 px',
    opacity: '100%',
  };

  return (
    <ModusWcPanel floating width="280px" height="100%" customClass="template-2d-viewer-panel">
      <div slot="header" className="template-2d-viewer-panel-header">
        <div className="template-2d-viewer-panel-heading">
          <ModusWcIcon name="info" decorative size="sm" />
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Object properties" />
        </div>
        <ModusWcButton
          variant="borderless"
          color="tertiary"
          shape="square"
          size="sm"
          aria-label="Close object properties"
          buttonAriaLabel="Close object properties"
          onButtonClick={onClose}
        >
          <ModusWcIcon name="close" decorative size="sm" />
        </ModusWcButton>
      </div>
      <div slot="body" className="template-2d-viewer-panel-body">
        <div className="template-2d-viewer-property-block">
          <ModusWcTypography hierarchy="p" size="xs" label="Layer" customClass="template-2d-viewer-muted" />
          <div className="template-2d-viewer-layer-select">
            <ModusWcSelect options={LAYER_OPTIONS} value="annotations" size="sm" customClass="template-2d-viewer-select" />
            <span className="template-2d-viewer-swatch template-2d-viewer-swatch-lg" style={{ backgroundColor: LAYER_COLORS[1] }} />
          </div>
        </div>

        <div className="template-2d-viewer-property-block">
          <ModusWcTypography hierarchy="p" size="xs" label="Position" customClass="template-2d-viewer-muted" />
          <div className="template-2d-viewer-position-grid">
            <ModusWcTextInput value={x} size="sm" customClass="template-2d-viewer-search" readOnly />
            <ModusWcTextInput value={y} size="sm" customClass="template-2d-viewer-search" readOnly />
          </div>
        </div>

        <div className="template-2d-viewer-property-block">
          <ModusWcTypography hierarchy="p" size="xs" label="Dimensions" customClass="template-2d-viewer-muted" />
          {DIMENSION_ROWS.map((row) => (
            <div key={row.key} className="template-2d-viewer-property-row">
              <ModusWcTypography hierarchy="p" size="sm" label={row.label} customClass="template-2d-viewer-muted" />
              <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={dimensions[row.key]} />
            </div>
          ))}
        </div>
      </div>
    </ModusWcPanel>
  );
};

export default PropertiesPanel;
