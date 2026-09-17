import React from 'react';

const HotspotOverlay = ({ hotspots, canvasWidth, canvasHeight, onSelect, disabled }) => {
  if (!hotspots?.length || !canvasWidth || !canvasHeight) return null;

  return (
    <div className="hotspot-overlay" aria-hidden={disabled}>
      {hotspots.map((spot) => (
        <button
          key={spot.key}
          type="button"
          className="hotspot"
          disabled={disabled}
          title={`Open ${spot.code}`}
          aria-label={`Open drawing ${spot.code}`}
          onClick={() => onSelect(spot)}
          style={{
            left: `${(spot.rect.left / canvasWidth) * 100}%`,
            top: `${(spot.rect.top / canvasHeight) * 100}%`,
            width: `${(spot.rect.width / canvasWidth) * 100}%`,
            height: `${(spot.rect.height / canvasHeight) * 100}%`,
          }}
        >
          <span className="visually-hidden">{spot.code}</span>
        </button>
      ))}
    </div>
  );
};

export default HotspotOverlay;
