import React, { useState } from 'react';
import SectionCard from '../Modus/SectionCard';
import { DEFAULT_CODE_REGEX, normalizeRegexSource } from '../../utils/drawingCodes';
import { Logger } from '../../utils/logger';
import { APP_NAME, APP_VERSION } from '../../appInfo';

const SettingsView = ({ settings, updateSetting, showToast, currentProject }) => {
  const [regexDraft, setRegexDraft] = useState(settings.codeRegex);

  const handleSaveRegex = () => {
    try {
      const pattern = normalizeRegexSource(regexDraft);
      new RegExp(pattern, 'gi');
      updateSetting('codeRegex', pattern);
      showToast('Drawing code pattern saved.', 'success');
    } catch {
      showToast('That regular expression is not valid.', 'danger');
    }
  };

  const handleExport = () => {
    const exported = Logger.exportLogs();
    showToast(exported ? 'Diagnostic log downloaded.' : 'No diagnostic entries yet.', exported ? 'success' : 'info');
  };

  const handleClear = () => {
    Logger.clearLogs();
    showToast('Diagnostic log cleared.', 'success');
  };

  return (
    <div className="settings-page d-flex flex-column gap-3">
      <SectionCard
        title="Project"
        description="Plan Linker is locked to the Trimble Connect project that opened this extension."
      >
        {currentProject?.name ? (
          <>
            <p className="fw-semibold mb-1">{currentProject.name}</p>
            <p className="small text-muted mb-0">{currentProject.id}</p>
          </>
        ) : (
          <p className="text-muted mb-0">Open Plan Linker from a project in Trimble Connect.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Drawing codes"
        description="Hotspots are created from PDF text that matches this regular expression."
      >
        <div>
          <label className="form-label" htmlFor="settings-regex">
            Matching pattern
          </label>
          <input
            id="settings-regex"
            type="text"
            className="form-control font-monospace"
            value={regexDraft}
            onChange={(event) => setRegexDraft(event.target.value)}
            spellCheck={false}
          />
          <div className="form-text">
            Default matches DET-01, DETAIL-12, ST-102, and D-3, with optional space or dot separators.
            Matching is case-insensitive. You can paste `/pattern/gi`; the slashes are stripped.
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setRegexDraft(DEFAULT_CODE_REGEX)}>
            Reset to default
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveRegex}>
            Save pattern
          </button>
        </div>
        <div>
          <label className="form-label" htmlFor="settings-folder">
            Fallback folder
          </label>
          <input
            id="settings-folder"
            type="text"
            className="form-control"
            value={settings.fallbackFolder}
            onChange={(event) => updateSetting('fallbackFolder', event.target.value)}
            placeholder="Details"
          />
          <div className="form-text">
            When several files match, prefer PDFs whose path contains this folder name.
          </div>
        </div>
        <div className="form-check">
          <input
            id="settings-panel"
            className="form-check-input"
            type="checkbox"
            checked={settings.showHotspotPanel}
            onChange={(event) => updateSetting('showHotspotPanel', event.target.checked)}
          />
          <label className="form-check-label" htmlFor="settings-panel">
            Show the hotspot list beside the drawing
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Diagnostics" description={`${APP_NAME} v${APP_VERSION}`}>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExport}>
            Export log
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleClear}>
            Clear log
          </button>
        </div>
      </SectionCard>

      <footer className="small text-muted">Version {APP_VERSION}</footer>
    </div>
  );
};

export default SettingsView;
