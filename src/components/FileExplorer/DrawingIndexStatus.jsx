import React from 'react';

const DrawingIndexStatus = ({
  sourceFileName = '',
  indexCount = 0,
  isIndexing = false,
  pickingIndex = false,
  bordered = false,
  showCaption = true,
  onChangeIndex,
  onClearIndex,
}) => {
  const hasIndex = Boolean(sourceFileName) || indexCount > 0;
  const label = sourceFileName || 'Geen index ingesteld';

  return (
    <div
      className={`drawing-index-status d-flex flex-wrap align-items-start justify-content-between gap-2${
        bordered ? ' drawing-index-status-bordered' : ''
      }`}
    >
      <div className="min-w-0">
        {showCaption ? <p className="small text-muted mb-0">Drawing index</p> : null}
        <p className="fw-semibold mb-0 text-truncate" title={label}>
          {label}
        </p>
        {hasIndex && indexCount > 0 ? (
          <p className="small text-muted mb-0">
            {indexCount} drawing{indexCount === 1 ? '' : 's'} indexed
          </p>
        ) : null}
      </div>
      <div className="d-flex flex-wrap gap-2 flex-shrink-0">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onChangeIndex}
          disabled={isIndexing}
        >
          {pickingIndex ? 'Cancel' : 'Wijzigen / Change Index'}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onClearIndex}
          disabled={isIndexing || !hasIndex}
        >
          Wissen / Clear Index
        </button>
      </div>
    </div>
  );
};

export default DrawingIndexStatus;
