import React from 'react';
import ModusIcon from '../Modus/ModusIcon';

const Toolbar = ({
  title,
  canGoBack,
  onBack,
  onBrowseFiles,
  pageNumber,
  pageCount,
  onPageChange,
  scaleLabel,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  hotspotCount,
  panelOpen,
  onTogglePanel,
  settingsOpen,
  onToggleSettings,
}) => (
  <header className="navbar navbar-expand bg-body border-bottom px-2 px-md-3 py-2 flex-shrink-0 viewer-toolbar">
    <div className="d-flex align-items-center gap-2 min-w-0 me-auto">
      <ModusIcon name="file-pdf" size="22px" extraClasses="text-primary flex-shrink-0" />
      <h1 className="h6 mb-0 text-truncate" title={title}>
        {title || 'Plan Linker'}
      </h1>
    </div>

    <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={onBrowseFiles}
      >
        <ModusIcon name="folder-open" size="16px" />
        <span className="d-none d-md-inline">Browse files</span>
        <span className="d-md-none">Files</span>
      </button>

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={onBack}
        disabled={!canGoBack}
      >
        <ModusIcon name="arrow-left" size="16px" />
        <span className="d-none d-md-inline">Back to overview</span>
        <span className="d-md-none">Back</span>
      </button>

      <div className="vr mx-1 d-none d-md-block" />

      <label className="visually-hidden" htmlFor="page-select">
        Page
      </label>
      <input
        id="page-select"
        type="number"
        className="form-control form-control-sm toolbar-page-input"
        min={1}
        max={pageCount || 1}
        value={pageNumber}
        onChange={(event) => onPageChange(Number(event.target.value))}
        disabled={!pageCount}
        aria-label="Page number"
      />
      <span className="small text-muted">of {pageCount || 0}</span>

      <div className="vr mx-1 d-none d-md-block" />

      <button
        type="button"
        className="btn btn-sm btn-icon-only"
        onClick={onZoomOut}
        disabled={!pageCount}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ModusIcon name="magnifying-glass-minus" size="18px" />
      </button>
      <span className="small text-muted toolbar-scale-label">{scaleLabel}</span>
      <button
        type="button"
        className="btn btn-sm btn-icon-only"
        onClick={onZoomIn}
        disabled={!pageCount}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ModusIcon name="magnifying-glass-plus" size="18px" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={onFitWidth}
        disabled={!pageCount}
      >
        Fit to width
      </button>

      <button
        type="button"
        className={`btn btn-sm ${panelOpen ? 'btn-primary' : 'btn-outline-secondary'}`}
        onClick={onTogglePanel}
        aria-pressed={panelOpen}
      >
        Hotspots{hotspotCount ? ` (${hotspotCount})` : ''}
      </button>
      <button
        type="button"
        className={`btn btn-sm ${settingsOpen ? 'btn-primary' : 'btn-outline-secondary'} d-inline-flex align-items-center gap-1`}
        onClick={onToggleSettings}
        aria-pressed={settingsOpen}
      >
        <ModusIcon name="gear" size="16px" />
        <span className="d-none d-lg-inline">Settings</span>
      </button>
    </div>
  </header>
);

export default Toolbar;
