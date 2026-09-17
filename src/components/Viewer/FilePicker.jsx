import React from 'react';
import ModusIcon from '../Modus/ModusIcon';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';

const FilePicker = ({
  projectName,
  files,
  isLoading,
  error,
  onRetry,
  onSelect,
  filter,
  onFilterChange,
}) => {
  const query = String(filter || '').trim().toLowerCase();
  const visible = query
    ? files.filter((file) => `${file.name} ${file.path}`.toLowerCase().includes(query))
    : files;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h2 className="h5 mb-1">Open a drawing</h2>
            <p className="text-muted small mb-0">
              {projectName
                ? `PDF files in ${projectName}. Pick an overview sheet to start hopping.`
                : 'Choose a project, then pick a PDF to open in the viewer.'}
            </p>
          </div>
          <label className="visually-hidden" htmlFor="pdf-filter">
            Filter drawings
          </label>
          <input
            id="pdf-filter"
            type="search"
            className="form-control form-control-sm file-filter"
            placeholder="Filter by name"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
          />
        </div>

        {isLoading ? <Spinner label="Loading project drawings…" /> : null}

        {error ? (
          <EmptyState
            icon="warning"
            title="Drawings could not be loaded"
            body={error.message}
            action={
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRetry}>
                Retry
              </button>
            }
          />
        ) : null}

        {!isLoading && !error && visible.length === 0 ? (
          <EmptyState
            icon="folder-open"
            title="No PDF files found"
            body="Upload drawing PDFs to this project, or check that the selected region matches the project."
          />
        ) : null}

        {!isLoading && visible.length > 0 ? (
          <ul className="list-group list-group-flush file-list">
            {visible.map((file) => (
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
        ) : null}
      </div>
    </div>
  );
};

export default FilePicker;
