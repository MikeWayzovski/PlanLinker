import React from 'react';

const ScannedPdfAlert = ({ fileName, onManualIndex, onDismiss }) => {
  if (!fileName) return null;

  return (
    <div className="alert alert-warning" role="alert">
      <p className="fw-semibold mb-1">Geen doorzoekbare tekst gevonden in {fileName}</p>
      <p className="small mb-2">
        Deze PDF bevat geen live tekst (waarschijnlijk een scan of afbeelding). Exporteer de
        tekeningenlijst met vector-lettertypen, of voeg handmatig een index toe.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {onDismiss ? (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onDismiss}>
            Sluiten
          </button>
        ) : null}
        {onManualIndex ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onManualIndex}>
            Handmatige Index Upload / Plakken
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ScannedPdfAlert;
