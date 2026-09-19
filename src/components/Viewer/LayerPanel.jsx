import React, { useMemo, useState } from 'react';
import {
  ModusWcButton,
  ModusWcCollapse,
  ModusWcIcon,
  ModusWcPanel,
  ModusWcSwitch,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import { readInputChecked, readInputString } from '../../utils/modusFormEvents';
import HotspotPanel from './HotspotPanel';

const LayerSwitch = ({ id, swatchClass, label, checked, onChange }) => (
  <div className="template-2d-viewer-layer-item">
    <div className="template-2d-viewer-layer-label-wrap">
      <span className={`template-2d-viewer-swatch ${swatchClass}`} />
      <div className="template-2d-viewer-layer-label">
        <ModusWcTypography hierarchy="p" size="sm" label={label} customClass="template-2d-viewer-truncate" />
      </div>
    </div>
    <ModusWcSwitch
      inputId={id}
      size="sm"
      value={checked}
      aria-label={label}
      onInputChange={(event) => onChange(readInputChecked(event))}
    />
  </div>
);

const LayerPanel = ({
  showCanvas,
  onToggleCanvas,
  showHotspots,
  onToggleHotspots,
  hotspots = [],
  scan,
  selectedKey,
  onSelect,
  disabled,
  lookupDescription,
  onClose,
}) => {
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [hotspotsExpanded, setHotspotsExpanded] = useState(true);
  const [query, setQuery] = useState('');

  const filteredHotspots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return hotspots;
    return hotspots.filter((spot) => {
      const description = lookupDescription?.(spot.code) || '';
      return `${spot.code} ${description}`.toLowerCase().includes(needle);
    });
  }, [hotspots, lookupDescription, query]);

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
            <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label="Layers" />
          </div>
          <div slot="content" className="template-2d-viewer-layer-list">
            <LayerSwitch
              id="layer-pdf"
              swatchClass="template-2d-viewer-swatch--pdf"
              label="PDF drawing"
              checked={showCanvas}
              onChange={onToggleCanvas}
            />
            <LayerSwitch
              id="layer-hotspots"
              swatchClass="template-2d-viewer-swatch--hotspots"
              label="Hotspot overlay"
              checked={showHotspots}
              onChange={onToggleHotspots}
            />
          </div>
        </ModusWcCollapse>

        <ModusWcCollapse
          collapseId="viewer-hotspots"
          expanded={hotspotsExpanded}
          onExpandedChange={(event) => setHotspotsExpanded(Boolean(event.detail?.expanded))}
        >
          <div slot="header">
            <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label="Detected hotspots" />
          </div>
          <div slot="content">
            <HotspotPanel
              hotspots={filteredHotspots}
              scan={scan}
              selectedKey={selectedKey}
              onSelect={onSelect}
              disabled={disabled}
              lookupDescription={lookupDescription}
            />
          </div>
        </ModusWcCollapse>
      </div>
    </ModusWcPanel>
  );
};

export default LayerPanel;
