import React from 'react';

const HotspotOverlay = ({ hotspots, canvasWidth, canvasHeight, onSelect, disabled, lookupDescription }) => {
  if (!hotspots?.length || !canvasWidth || !canvasHeight) return null;

  return (
    <div className="hotspot-overlay" aria-hidden={disabled}>
      {hotspots.map((spot) => {
        const description = lookupDescription?.(spot.code) || '';
        const label = description ? `${spot.code} - ${description}` : spot.code;
        return (
          <button
            key={spot.key}
            type="button"
            className="hotspot"
            disabled={disabled}
            title={label}
            data-tooltip={label}
            aria-label={description ? `Open drawing ${label}` : `Open drawing ${spot.code}`}
            onClick={() => onSelect(spot)}
            style={{
              left: `${(spot.rect.left / canvasWidth) * 100}%`,
              top: `${(spot.rect.top / canvasHeight) * 100}%`,
              width: `${(spot.rect.width / canvasWidth) * 100}%`,
              height: `${(spot.rect.height / canvasHeight) * 100}%`,
            }}
          >
            <span className="visually-hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default HotspotOverlay;
