import React from 'react';
import ModusIcon from '../Modus/ModusIcon';

const MatchPicker = ({ code, matches, onSelect, onCancel }) => {
  if (!matches?.length) return null;

  return (
    <div className="match-picker-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="card border-0 shadow match-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-body">
          <h2 id="match-picker-title" className="h5 mb-1">
            Choose a sheet for {code}
          </h2>
          <p className="small text-muted mb-3">
            Several files match this drawing code. Pick the detail sheet to open.
          </p>
          <ul className="list-group list-group-flush">
            {matches.map((file) => (
              <li key={file.id} className="list-group-item px-0">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-1 py-2"
                  onClick={() => onSelect(file)}
                >
                  <ModusIcon name="file-pdf" size="20px" extraClasses="text-danger flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="d-block text-truncate fw-semibold">{file.name}</span>
                    {file.path ? <span className="d-block small text-muted text-truncate">{file.path}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="d-flex justify-content-end mt-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPicker;
