import React from 'react';
import ModusIcon from '../Modus/ModusIcon';

const ToolButton = ({
  label,
  title,
  icon,
  onClick,
  disabled,
  pressed,
  extraClasses = '',
}) => (
  <button
    type="button"
    className={`btn btn-sm btn-icon-only ${pressed ? 'btn-primary' : 'btn-outline-secondary'} ${extraClasses}`.trim()}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={pressed}
    title={title || label}
  >
    <ModusIcon name={icon} size="16px" />
  </button>
);

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
  fitMode,
  onFitWidth,
  onFitPage,
  tool,
  onToolChange,
  panelOpen,
  onTogglePanel,
  settingsOpen,
  onToggleSettings,
  disabled,
}) => (
  <header className="navbar navbar-expand viewer-toolbar flex-shrink-0 px-2 px-md-3 py-2">
    <div className="d-flex align-items-center gap-2 min-w-0 me-2">
      <ModusIcon name="file-pdf" size="22px" extraClasses="text-primary flex-shrink-0" />
      <h1 className="h6 mb-0 text-truncate" title={title}>
        {title || 'Plan Linker'}
      </h1>
    </div>

    <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end flex-grow-1">
      <div className="btn-group" role="group" aria-label="Navigate">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          onClick={onBrowseFiles}
        >
          <ModusIcon name="folder-open" size="16px" />
          <span className="d-none d-lg-inline">Browse files</span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          onClick={onBack}
          disabled={!canGoBack}
        >
          <ModusIcon name="arrow-left" size="16px" />
          <span className="d-none d-xl-inline">Back</span>
        </button>
      </div>

      <div className="vr mx-1 d-none d-md-block" />

      <div className="btn-group" role="group" aria-label="Pointer tools">
        <ToolButton
          label="Select"
          icon="cursor"
          pressed={tool === 'select'}
          onClick={() => onToolChange('select')}
          disabled={disabled}
        />
        <ToolButton
          label="Pan"
          icon="hand-grabbing"
          pressed={tool === 'pan'}
          onClick={() => onToolChange('pan')}
          disabled={disabled}
        />
      </div>

      <div className="vr mx-1 d-none d-md-block" />

      <div className="btn-group" role="group" aria-label="Zoom">
        <ToolButton label="Zoom out" icon="minus" onClick={onZoomOut} disabled={disabled} />
        <span className="small text-muted toolbar-scale-label align-self-center px-2">{scaleLabel}</span>
        <ToolButton label="Zoom in" icon="plus" onClick={onZoomIn} disabled={disabled} />
        <ToolButton
          label="Fit to width"
          icon="arrows-horizontal"
          pressed={fitMode === 'width'}
          onClick={onFitWidth}
          disabled={disabled}
        />
        <ToolButton
          label="Fit to page"
          icon="corners-out"
          pressed={fitMode === 'page'}
          onClick={onFitPage}
          disabled={disabled}
        />
      </div>

      <div className="vr mx-1 d-none d-md-block" />

      <div className="btn-group" role="group" aria-label="Page">
        <ToolButton
          label="Previous page"
          icon="caret-left"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={disabled || pageNumber <= 1}
        />
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
          disabled={disabled}
          aria-label="Current page"
        />
        <span className="small text-muted align-self-center px-1">/ {pageCount || 0}</span>
        <ToolButton
          label="Next page"
          icon="caret-right"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={disabled || pageNumber >= pageCount}
        />
      </div>

      <div className="vr mx-1 d-none d-md-block" />

      <ToolButton
        label="Layer management"
        icon="stack"
        pressed={panelOpen}
        onClick={onTogglePanel}
      />
      <ToolButton
        label="Settings"
        icon="gear"
        pressed={settingsOpen}
        onClick={onToggleSettings}
      />
    </div>
  </header>
);

export default Toolbar;
