import React, { useState } from 'react';
import SectionCard from '../Modus/SectionCard';
import AuthImage from '../Modus/AuthImage';
import ModusIcon from '../Modus/ModusIcon';
import DrawingIndexStatus from '../FileExplorer/DrawingIndexStatus';
import ScannedPdfAlert from '../FileExplorer/ScannedPdfAlert';
import { DEFAULT_CODE_REGEX, normalizeRegexSource } from '../../utils/drawingCodes';
import { parseIndexTableText, uniqueIndexCount } from '../../utils/drawingListParser';
import { formatProjectSize } from '../../utils/formatBytes';
import { Logger } from '../../utils/logger';
import { APP_NAME, APP_VERSION } from '../../appInfo';

const SettingsView = ({
  settings,
  updateSetting,
  showToast,
  currentProject,
  projectThumbnailUrl = '',
  fileCount = 0,
  totalSize = 0,
  getToken,
  indexSourceName = '',
  indexCount = 0,
  isIndexing = false,
  scannedFileName = '',
  onChangeIndex,
  onClearIndex,
  onApplyManualIndex,
  onDismissScanned,
}) => {
  const [regexDraft, setRegexDraft] = useState(settings.codeRegex);
  const [manualOpen, setManualOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const showManual = manualOpen || Boolean(scannedFileName);

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

  const applyManualText = (text, sourceName) => {
    const map = parseIndexTableText(text);
    const count = uniqueIndexCount(map);
    if (!count) {
      showToast('No drawing codes were found in that table. Use Tekeningnummer;Omschrijving.', 'warning');
      return;
    }
    onApplyManualIndex?.(map, sourceName);
    setPasteText('');
    setManualOpen(false);
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const lower = String(file.name || '').toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      setManualOpen(true);
      showToast('Save the Excel sheet as CSV, or paste Tekeningnummer;Omschrijving here.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setPasteText(text);
      setManualOpen(true);
      applyManualText(text, file.name);
    };
    reader.onerror = () => {
      showToast('That file could not be read.', 'danger');
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-page d-flex flex-column gap-3">
      <SectionCard
        title="Project"
        description="Plan Linker is locked to the Trimble Connect project that opened this extension."
      >
        {currentProject?.name ? (
          <div className="d-flex align-items-start gap-3">
            <span className="project-thumb-wrap">
              <AuthImage
                key={projectThumbnailUrl || 'project'}
                src={projectThumbnailUrl}
                alt=""
                className="project-thumb"
                getToken={getToken}
                fallback={<ModusIcon name="folder-simple" size="28px" extraClasses="text-primary" />}
              />
            </span>
            <div className="min-w-0">
              <p className="fw-semibold mb-1">{currentProject.name}</p>
              <p className="small text-muted mb-2">{currentProject.id}</p>
              <p className="small text-muted mb-0">
                {formatProjectSize(totalSize)} · {fileCount} file{fileCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
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
            Default matches DET-01, ST-102, UO101, UO.300, and D-3, with optional space or dot separators.
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
            Show the layer panel beside the drawing
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Drawing index"
        description="A project drawing list maps codes such as UO101 to titles used in search and hotspot tooltips."
      >
        <ScannedPdfAlert fileName={scannedFileName} onDismiss={onDismissScanned} />
        <DrawingIndexStatus
          sourceFileName={indexSourceName}
          indexCount={indexCount}
          isIndexing={isIndexing}
          showCaption={false}
          onChangeIndex={onChangeIndex}
          onClearIndex={onClearIndex}
        />
        <div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setManualOpen((open) => !open)}
          >
            Handmatige Index Upload / Plakken
          </button>
        </div>
        {showManual ? (
          <div className="d-flex flex-column gap-3">
            <div>
              <label className="form-label" htmlFor="manual-index-file">
                Upload CSV
              </label>
              <input
                id="manual-index-file"
                type="file"
                className="form-control form-control-sm"
                accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/tab-separated-values"
                onChange={handleUpload}
              />
              <div className="form-text">
                Columns: Tekeningnummer;Omschrijving. Excel sheets can be pasted or saved as CSV.
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="manual-index-paste">
                Paste index
              </label>
              <textarea
                id="manual-index-paste"
                className="form-control"
                rows={6}
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                placeholder={'UO101;Plattegrond begane grond\nUO.300;Doorsnede A-A deel 1'}
                spellCheck={false}
              />
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setPasteText('');
                  setManualOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => applyManualText(pasteText, 'Handmatige index')}
                disabled={!String(pasteText || '').trim()}
              >
                Save index
              </button>
            </div>
          </div>
        ) : null}
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
