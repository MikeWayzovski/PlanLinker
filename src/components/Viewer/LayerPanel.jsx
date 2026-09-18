import React, { useMemo, useState } from 'react';
import {
  ModusWcButton,
  ModusWcCollapse,
  ModusWcIcon,
  ModusWcPanel,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import { readInputString } from '../../utils/modusFormEvents';
import { TEMPLATE_LAYERS } from './layerColors';

const LayerRow = ({ name, color, nested, visible, onToggle }) => (
  <div className={`template-2d-viewer-layer-item${nested ? ' is-nested' : ''}`}>
    <div className="template-2d-viewer-layer-label-wrap">
      <ModusWcButton
        variant="borderless"
        color="tertiary"
        shape="square"
        size="sm"
        aria-label={`${visible ? 'Hide' : 'Show'} ${name}`}
        buttonAriaLabel={`${visible ? 'Hide' : 'Show'} ${name}`}
        onButtonClick={onToggle}
      >
        <ModusWcIcon name={visible ? 'visibility_on' : 'visibility_off'} decorative size="sm" />
      </ModusWcButton>
      <span className="template-2d-viewer-swatch" style={{ backgroundColor: color }} />
      <div className="template-2d-viewer-layer-label">
        <ModusWcTypography hierarchy="p" size="sm" label={name} customClass="template-2d-viewer-truncate" />
      </div>
    </div>
    <ModusWcButton
      variant="borderless"
      color="tertiary"
      shape="square"
      size="sm"
      aria-label="More options"
      buttonAriaLabel="More options"
      customClass="template-2d-viewer-more"
    >
      <ModusWcIcon name="more_vertical" decorative size="sm" />
    </ModusWcButton>
  </div>
);

const LayerList = ({ layers, visibility, onToggle, query }) => {
  const visibleLayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return layers;
    return layers.filter((layer) => layer.name.toLowerCase().includes(needle));
  }, [layers, query]);

  return (
    <div className="template-2d-viewer-layer-list">
      {visibleLayers.map((layer) => (
        <LayerRow
          key={layer.id}
          name={layer.name}
          color={layer.color}
          nested={layer.nested}
          visible={visibility[layer.id] !== false}
          onToggle={() => onToggle(layer.id)}
        />
      ))}
    </div>
  );
};

const LayerPanel = ({
  visibility,
  onToggleLayer,
  onClose,
}) => {
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [surfacesExpanded, setSurfacesExpanded] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <ModusWcPanel floating width="280px" height="100%" customClass="template-2d-viewer-panel">
      <div slot="header" className="template-2d-viewer-panel-header">
        <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Layer management" />
        <ModusWcButton
          variant="borderless"
          color="tertiary"
          shape="square"
          size="sm"
          aria-label="Close layer management"
          buttonAriaLabel="Close layer management"
          onButtonClick={onClose}
        >
          <ModusWcIcon name="close" decorative size="sm" />
        </ModusWcButton>
      </div>
      <div slot="body" className="template-2d-viewer-panel-body">
        <ModusWcTextInput
          placeholder="Search"
          includeSearch
          size="sm"
          value={query}
          customClass="template-2d-viewer-search"
          onInputChange={(event) => setQuery(readInputString(event))}
        />

        <ModusWcCollapse
          collapseId="viewer-layers"
          expanded={layersExpanded}
          onExpandedChange={(event) => setLayersExpanded(Boolean(event.detail?.expanded))}
        >
          <div slot="header">
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              weight="semibold"
              label="Layers"
              customClass="template-2d-viewer-truncate"
            />
          </div>
          <div slot="content">
            <LayerList layers={TEMPLATE_LAYERS} visibility={visibility} onToggle={onToggleLayer} query={query} />
          </div>
        </ModusWcCollapse>

        <ModusWcCollapse
          collapseId="viewer-styles"
          expanded={surfacesExpanded}
          onExpandedChange={(event) => setSurfacesExpanded(Boolean(event.detail?.expanded))}
        >
          <div slot="header">
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              weight="semibold"
              label="Styles"
              customClass="template-2d-viewer-truncate"
            />
          </div>
          <div slot="content">
            <LayerList layers={TEMPLATE_LAYERS} visibility={visibility} onToggle={onToggleLayer} query={query} />
          </div>
        </ModusWcCollapse>
      </div>
    </ModusWcPanel>
  );
};

export default LayerPanel;
