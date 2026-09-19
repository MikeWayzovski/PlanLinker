import React from 'react';
import { ModusWcButton, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';
import EmptyState from '../Modus/EmptyState';

const HotspotPanel = ({ hotspots, scan, selectedKey, onSelect, disabled, lookupDescription }) => {
  const itemCount = scan?.itemCount;
  const noText = itemCount === 0;
  const emptyTitle = noText ? 'No selectable text on this page' : 'No codes on this page';
  const emptyBody = noText
    ? 'This PDF has no text layer. CAD exports often draw letters as outlines, so Plan Linker cannot detect codes.'
    : scan?.sample
      ? `The matching pattern did not hit extracted text. Sample: “${scan.sample}”. Change the pattern in Settings.`
      : 'Adjust the matching pattern in Settings if detail marks use a different format.';

  return (
    <div className="hotspot-panel-section">
      <ModusWcTypography
        hierarchy="p"
        size="xs"
        label={
          typeof itemCount === 'number'
            ? `${itemCount} text fragment${itemCount === 1 ? '' : 's'} scanned`
            : 'Codes found on this page'
        }
        customClass="template-2d-viewer-muted"
      />
      <div className="hotspot-panel-list">
        <div hidden={hotspots.length > 0} aria-hidden={hotspots.length > 0}>
          <EmptyState icon="magnifying-glass" title={emptyTitle} body={emptyBody} />
        </div>
        <ul className="template-2d-viewer-hotspot-list" hidden={hotspots.length === 0} aria-hidden={hotspots.length === 0}>
          {hotspots.map((spot) => {
            const description = lookupDescription?.(spot.code) || '';
            return (
              <li key={spot.key} className={`template-2d-viewer-layer-item${selectedKey === spot.key ? ' is-selected' : ''}`}>
                <ModusWcButton
                  variant="borderless"
                  color="tertiary"
                  size="sm"
                  pressed={selectedKey === spot.key}
                  customClass="template-2d-viewer-hotspot-button"
                  disabled={disabled}
                  onButtonClick={() => onSelect(spot)}
                >
                  <span className="template-2d-viewer-hotspot-copy">
                    <span className="fw-semibold d-block">{spot.code}</span>
                    {description ? <span className="d-block small text-muted">{description}</span> : null}
                  </span>
                </ModusWcButton>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default HotspotPanel;
