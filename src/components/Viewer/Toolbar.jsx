import React from 'react';
import {
  ModusWcButton,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcSwitch,
  ModusWcToolbar,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import { readInputChecked } from '../../utils/modusFormEvents';

const IconTool = ({ label, icon, onClick, disabled, pressed, customClass = '' }) => (
  <ModusWcButton
    variant="borderless"
    color="tertiary"
    shape="square"
    size="sm"
    aria-label={label}
    buttonAriaLabel={label}
    disabled={disabled}
    pressed={pressed}
    customClass={`${pressed ? 'is-tool-active' : ''} ${customClass}`.trim()}
    onButtonClick={onClick}
  >
    <ModusWcIcon name={icon} decorative size="sm" />
  </ModusWcButton>
);

export const LeftToolbar = ({ panelOpen, onTogglePanel, onToggleProperties, onBrowseFiles }) => (
  <div className="template-2d-viewer-toolbar template-2d-viewer-left-toolbar-wrapper">
    <ModusWcToolbar
      customClass="template-2d-viewer-left-toolbar"
      aria-label="Panel tools"
    >
      <div slot="start" className="template-2d-viewer-left-tools">
        <IconTool
          label="Layer management"
          icon="layer"
          pressed={panelOpen}
          customClass={panelOpen ? 'is-tool-active' : ''}
          onClick={onTogglePanel}
        />
        <IconTool label="Brush" icon="brush" onClick={onToggleProperties} />
        <IconTool label="Share" icon="share" onClick={onBrowseFiles} />
      </div>
    </ModusWcToolbar>
  </div>
);

export const TopToolbar = ({
  pageNumber,
  pageCount,
  onPageChange,
  canGoBack,
  onBack,
  tool,
  onToolChange,
  onZoomIn,
  fitMode,
  onFitPage,
  showHotspots,
  onToggleHotspots,
  onBrowseFiles,
  disabled,
}) => (
  <div className="template-2d-viewer-toolbar template-2d-viewer-top-toolbar-wrapper">
    <ModusWcToolbar customClass="template-2d-viewer-top-toolbar" aria-label="Editor tools">
      <div slot="start" className="template-2d-viewer-top-tools">
        <IconTool
          label="Previous"
          icon="chevron_left"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={disabled || pageNumber <= 1}
        />
        <ModusWcDivider orientation="vertical" customClass="template-2d-viewer-divider" />
        <IconTool
          label="Cursor"
          icon="cursor"
          pressed={tool === 'select'}
          onClick={() => onToolChange('select')}
          disabled={disabled}
        />
        <IconTool
          label="Pan"
          icon="pan"
          pressed={tool === 'pan'}
          onClick={() => onToolChange('pan')}
          disabled={disabled}
        />
        <IconTool label="Undo" icon="undo" onClick={onBack} disabled={!canGoBack} />
        <IconTool
          label="Redo"
          icon="redo"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={disabled || pageNumber >= pageCount}
        />
        <IconTool label="Save disk" icon="save_disk" onClick={onBrowseFiles} />
        <IconTool
          label="View grid"
          icon="view_grid"
          pressed={fitMode === 'page'}
          onClick={onFitPage}
          disabled={disabled}
        />
        <IconTool label="Add" icon="add" onClick={onZoomIn} disabled={disabled} />
        <IconTool
          label="Visibility on"
          icon="visibility_on"
          pressed={showHotspots}
          onClick={() => onToggleHotspots(!showHotspots)}
          disabled={disabled}
        />
        <div className="template-2d-viewer-visibility">
          <ModusWcSwitch
            size="sm"
            value={showHotspots}
            disabled={disabled}
            onInputChange={(event) => onToggleHotspots(readInputChecked(event))}
          />
          <ModusWcTypography hierarchy="p" size="xs" label="ON" customClass="template-2d-viewer-muted" />
        </div>
      </div>
      <div slot="end" className="template-2d-viewer-top-end">
        <ModusWcButton variant="outlined" color="primary" size="sm" onButtonClick={onBrowseFiles}>
          Save
        </ModusWcButton>
      </div>
    </ModusWcToolbar>
  </div>
);

export const BottomToolbar = ({
  onToggleSettings,
  onFitPage,
  fitMode,
  onZoomIn,
  onZoomOut,
  onToggleProperties,
  disabled,
}) => (
  <div className="template-2d-viewer-bottom-toolbar-outer">
    <div className="template-2d-viewer-bottom-toolbar-wrapper">
      <ModusWcToolbar customClass="template-2d-viewer-bottom-toolbar" aria-label="Editor controls">
        <div slot="start" className="template-2d-viewer-bottom-tools">
          <IconTool label="Settings" icon="settings" onClick={onToggleSettings} />
          <IconTool
            label="View grid"
            icon="view_grid"
            pressed={fitMode === 'page'}
            customClass={fitMode === 'page' ? 'is-tool-active' : ''}
            onClick={onFitPage}
            disabled={disabled}
          />
          <IconTool label="Add" icon="add" onClick={onZoomIn} disabled={disabled} />
          <IconTool label="Remove" icon="remove" onClick={onZoomOut} disabled={disabled} />
          <IconTool label="Pencil" icon="pencil" disabled={disabled} />
          <IconTool label="Brush" icon="brush" onClick={onToggleProperties} />
        </div>
      </ModusWcToolbar>
    </div>
  </div>
);
