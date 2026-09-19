import React from 'react';
import {
  ModusWcButton,
  ModusWcButtonGroup,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcToolbar,
} from '@trimble-oss/moduswebcomponents-react';

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
    <ModusWcIcon name={icon} decorative size="xs" />
  </ModusWcButton>
);

const GroupedTool = ({ label, icon, onClick, disabled, pressed }) => (
  <ModusWcButton
    shape="square"
    size="sm"
    aria-label={label}
    buttonAriaLabel={label}
    disabled={disabled}
    pressed={pressed}
    onButtonClick={onClick}
  >
    <ModusWcIcon name={icon} decorative size="xs" />
  </ModusWcButton>
);

export const TopToolbar = ({
  canGoBack,
  onBack,
  tool,
  onToolChange,
  showHotspots,
  onToggleHotspots,
  onDownload,
  onClose,
  disabled,
  canDownload,
}) => (
  <div className="template-2d-viewer-toolbar template-2d-viewer-top-toolbar-wrapper">
    <ModusWcToolbar customClass="template-2d-viewer-top-toolbar" aria-label="Viewer tools">
      <div slot="start" className="template-2d-viewer-top-tools">
        <IconTool
          label={canGoBack ? 'Back to previous drawing' : 'Back to files'}
          icon="arrow_back"
          onClick={onBack}
        />
        <ModusWcDivider orientation="vertical" customClass="template-2d-viewer-divider" />
        <div className="template-2d-viewer-tool-group">
          <ModusWcButtonGroup
            variant="outlined"
            color="tertiary"
            selectionType="single"
            disabled={disabled}
          >
            <GroupedTool
              label="Select"
              icon="cursor"
              pressed={tool === 'select'}
              onClick={() => onToolChange('select')}
              disabled={disabled}
            />
            <GroupedTool
              label="Pan"
              icon="pan"
              pressed={tool === 'pan'}
              onClick={() => onToolChange('pan')}
              disabled={disabled}
            />
            <GroupedTool
              label="Box zoom"
              icon="zoom_box"
              pressed={tool === 'boxzoom'}
              onClick={() => onToolChange('boxzoom')}
              disabled={disabled}
            />
          </ModusWcButtonGroup>
        </div>
        <ModusWcDivider orientation="vertical" customClass="template-2d-viewer-divider" />
        <IconTool
          label={showHotspots ? 'Hide hotspots' : 'Show hotspots'}
          icon={showHotspots ? 'visibility_on' : 'visibility_off'}
          pressed={showHotspots}
          onClick={onToggleHotspots}
          disabled={disabled}
        />
      </div>
      <div slot="end" className="template-2d-viewer-top-end">
        <IconTool
          label="Download PDF"
          icon="download"
          onClick={onDownload}
          disabled={disabled || !canDownload}
        />
        <IconTool label="Close viewer" icon="close" onClick={onClose} />
      </div>
    </ModusWcToolbar>
  </div>
);

export const BottomToolbar = ({
  onZoomIn,
  onZoomOut,
  onFitPage,
  fitMode,
  panelOpen,
  onTogglePanel,
  propertiesOpen,
  onToggleProperties,
  onToggleSettings,
  disabled,
}) => (
  <div className="template-2d-viewer-bottom-toolbar-outer">
    <div className="template-2d-viewer-bottom-toolbar-wrapper">
      <ModusWcToolbar customClass="template-2d-viewer-bottom-toolbar" aria-label="View controls">
        <div slot="start" className="template-2d-viewer-bottom-tools">
          <IconTool label="Zoom in" icon="add" onClick={onZoomIn} disabled={disabled} />
          <IconTool label="Zoom out" icon="remove" onClick={onZoomOut} disabled={disabled} />
          <IconTool
            label="Fit to view"
            icon="window_fit"
            pressed={fitMode === 'page'}
            onClick={onFitPage}
            disabled={disabled}
          />
          <ModusWcDivider orientation="vertical" customClass="template-2d-viewer-divider" />
          <IconTool
            label="Hotspot list"
            icon="layer"
            pressed={panelOpen}
            onClick={onTogglePanel}
          />
          <IconTool
            label="Object properties"
            icon="info"
            pressed={propertiesOpen}
            onClick={onToggleProperties}
          />
          <IconTool label="Settings" icon="settings" onClick={onToggleSettings} />
        </div>
      </ModusWcToolbar>
    </div>
  </div>
);
