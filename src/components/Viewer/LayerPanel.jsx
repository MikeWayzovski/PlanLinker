import React from 'react';
import ModusIcon from '../Modus/ModusIcon';
import HotspotPanel from './HotspotPanel';

const LayerToggle = ({ id, label, checked, onChange, icon }) => (
  <div className="form-check form-switch mb-2">
    <input
      id={id}
      className="form-check-input"
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <label className="form-check-label d-inline-flex align-items-center gap-2" htmlFor={id}>
      <ModusIcon name={icon} size="16px" extraClasses="text-muted" />
      {label}
    </label>
  </div>
);

const LayerPanel = ({
  showCanvas,
  onToggleCanvas,
  showHotspots,
  onToggleHotspots,
  indexSourceName = '',
  indexCount = 0,
  hotspots,
  scan,
  onSelect,
  disabled,
  lookupDescription,
}) => (
  <aside className="layer-panel border-end flex-shrink-0 d-flex flex-column min-h-0" aria-label="Layer management">
    <div className="px-3 py-2 border-bottom">
      <h2 className="h6 mb-0">Layers</h2>
      <p className="small text-muted mb-0">Show or hide drawing content</p>
    </div>
    <div className="px-3 py-3 border-bottom">
      <LayerToggle
        id="layer-pdf"
        label="PDF drawing"
        icon="file-pdf"
        checked={showCanvas}
        onChange={onToggleCanvas}
      />
      <LayerToggle
        id="layer-hotspots"
        label="Hotspots and links"
        icon="eye"
        checked={showHotspots}
        onChange={onToggleHotspots}
      />
    </div>
    <div className="px-3 py-3 border-bottom">
      <h3 className="h6 mb-1">Drawing index</h3>
      <p className="small mb-0 text-truncate" title={indexSourceName || 'No index file linked'}>
        {indexSourceName || 'No index file linked'}
      </p>
      {indexCount > 0 ? (
        <p className="small text-muted mb-0">
          {indexCount} drawing{indexCount === 1 ? '' : 's'} indexed
        </p>
      ) : null}
    </div>
    <HotspotPanel
      hotspots={hotspots}
      scan={scan}
      onSelect={onSelect}
      disabled={disabled}
      lookupDescription={lookupDescription}
    />
  </aside>
);

export default LayerPanel;
