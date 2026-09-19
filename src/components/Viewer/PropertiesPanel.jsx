import React from 'react';
import {
  ModusWcButton,
  ModusWcIcon,
  ModusWcPanel,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

const PropertyRow = ({ label, value }) => (
  <div className="template-2d-viewer-property-row">
    <ModusWcTypography hierarchy="p" size="sm" label={label} customClass="template-2d-viewer-muted" />
    <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={value || '—'} customClass="template-2d-viewer-truncate" />
  </div>
);

const PropertiesPanel = ({
  selectedHotspot,
  lookupDescription,
  matchedFiles = [],
  isResolving = false,
  isBusy = false,
  onOpenDetail,
  onClose,
}) => {
  const description = selectedHotspot ? lookupDescription?.(selectedHotspot.code) || '' : '';
  const matchedName =
    matchedFiles.length === 1
      ? matchedFiles[0].name
      : matchedFiles.length > 1
        ? `${matchedFiles.length} matching files`
        : '';

  return (
    <ModusWcPanel floating width="280px" height="100%" customClass="template-2d-viewer-panel">
      <div slot="header" className="template-2d-viewer-panel-header">
        <div className="template-2d-viewer-panel-heading">
          <ModusWcIcon name="info" decorative size="sm" />
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Object properties" />
        </div>
        <ModusWcButton
          variant="borderless"
          color="tertiary"
          shape="square"
          size="sm"
          aria-label="Close object properties"
          buttonAriaLabel="Close object properties"
          onButtonClick={onClose}
        >
          <ModusWcIcon name="close" decorative size="sm" />
        </ModusWcButton>
      </div>
      <div slot="body" className="template-2d-viewer-panel-body">
        <div hidden={Boolean(selectedHotspot)} aria-hidden={Boolean(selectedHotspot)}>
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            label="Selecteer een hotspot op de tekening om details te bekijken."
            customClass="template-2d-viewer-muted"
          />
        </div>
        <div hidden={!selectedHotspot} aria-hidden={!selectedHotspot} className="template-2d-viewer-property-block">
          <PropertyRow label="Code" value={selectedHotspot?.code} />
          <PropertyRow label="Title" value={description} />
          <PropertyRow
            label="Matched file"
            value={isResolving || isBusy ? 'Searching…' : matchedName || 'No matching file yet'}
          />
          <ModusWcButton
            variant="filled"
            color="primary"
            size="sm"
            fullWidth
            customClass="template-2d-viewer-open-detail"
            disabled={!selectedHotspot || isBusy}
            onButtonClick={() => onOpenDetail?.(selectedHotspot)}
          >
            <ModusWcIcon name="launch" decorative size="xs" />
            Open Detailtekening
          </ModusWcButton>
        </div>
      </div>
    </ModusWcPanel>
  );
};

export default PropertiesPanel;
