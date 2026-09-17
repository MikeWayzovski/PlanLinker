import React from 'react';
import EmptyState from '../Modus/EmptyState';

const HotspotPanel = ({ hotspots, onSelect, disabled }) => (
  <aside className="hotspot-panel bg-body border-end flex-shrink-0" aria-label="Detected hotspots">
    <div className="px-3 py-2 border-bottom">
      <h2 className="h6 mb-0">Hotspots</h2>
      <p className="small text-muted mb-0">Codes found on this page</p>
    </div>
    <div className="hotspot-panel-list">
      {hotspots.length === 0 ? (
        <EmptyState
          icon="magnifying-glass"
          title="No codes on this page"
          body="Adjust the matching regex in settings if detail marks use a different pattern."
        />
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
                <span className="fw-semibold">{spot.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </aside>
);

export default HotspotPanel;
