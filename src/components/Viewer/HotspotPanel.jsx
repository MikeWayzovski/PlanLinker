import React from 'react';
import EmptyState from '../Modus/EmptyState';

const HotspotPanel = ({ hotspots, scan, onSelect, disabled, lookupDescription }) => {
  const itemCount = scan?.itemCount;
  const noText = itemCount === 0;
  const emptyTitle = noText ? 'No selectable text on this page' : 'No codes on this page';
  const emptyBody = noText
    ? 'This PDF has no text layer. CAD exports often draw letters as outlines, so Plan Linker cannot detect codes.'
    : scan?.sample
      ? `The matching pattern did not hit extracted text. Sample: “${scan.sample}”. Change the pattern in Settings.`
      : 'Adjust the matching pattern in Settings if detail marks use a different format.';

  return (
    <div className="hotspot-panel-section d-flex flex-column min-h-0 flex-grow-1">
      <div className="px-3 py-2 border-bottom">
        <h3 className="h6 mb-0">Hotspots</h3>
        <p className="small text-muted mb-0">
          {typeof itemCount === 'number'
            ? `${itemCount} text fragment${itemCount === 1 ? '' : 's'} scanned`
            : 'Codes found on this page'}
        </p>
      </div>
      <div className="hotspot-panel-list">
        {hotspots.length === 0 ? (
          <EmptyState icon="magnifying-glass" title={emptyTitle} body={emptyBody} />
        ) : (
          <ul className="list-group list-group-flush">
            {hotspots.map((spot) => (
              <li key={spot.key} className="list-group-item px-0">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none w-100 text-start px-3 py-2"
                  onClick={() => onSelect(spot)}
                  disabled={disabled}
                >
                  <span className="fw-semibold d-block">{spot.code}</span>
                  {lookupDescription?.(spot.code) ? (
                    <span className="d-block small text-muted">{lookupDescription(spot.code)}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HotspotPanel;
