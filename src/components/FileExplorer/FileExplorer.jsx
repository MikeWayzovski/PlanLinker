import React, { useEffect, useMemo, useState } from 'react';
import ModusIcon from '../Modus/ModusIcon';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';
import AuthImage from '../Modus/AuthImage';
import BreadcrumbNav from './BreadcrumbNav';
import DrawingIndexStatus from './DrawingIndexStatus';
import ScannedPdfAlert from './ScannedPdfAlert';
import { APP_NAME, APP_VERSION } from '../../appInfo';
import { formatBytes, formatShortDate } from '../../utils/formatBytes';
import { Logger } from '../../utils/logger';
import {
  descriptionForFile,
  fileMatchesSearch,
  findIndexCandidate,
} from '../../utils/drawingListParser';

const byName = (a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' });

const isChildOf = (item, folderId, byId, rootFolderId) => {
  if (folderId && item.id === folderId) return false;
  const parentMissing = !item.parentId || !byId.has(item.parentId);
  if (!folderId) return parentMissing;
  if (item.parentId === folderId) return true;
  return parentMissing && folderId === rootFolderId;
};

const FileThumb = ({ file, getToken, folder = false }) => (
  <span className="file-thumb-wrap">
    {folder ? (
      <ModusIcon name="folder-simple" size="20px" extraClasses="text-primary" />
    ) : (
      <AuthImage
        key={file?.thumbnailUrl || file?.id || 'pdf'}
        src={file?.thumbnailUrl}
        alt=""
        className="file-thumb"
        getToken={getToken}
        fallback={<ModusIcon name="file-pdf" size="20px" extraClasses="text-danger" />}
      />
    )}
  </span>
);

const activateRow = (event, action) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

const FileExplorer = ({
  projectName,
  items,
  isLoading,
  error,
  onRetry,
  onRefresh,
  onSelectFile,
  onOpenSettings,
  canReturnToDrawing,
  onReturnToDrawing,
  hasIndex = false,
  indexMap = {},
  dismissedIds = [],
  lookupDescription,
  onIndexFile,
  onDismissIndex,
  isIndexing = false,
  indexSourceName = '',
  indexCount = 0,
  pickingIndex = false,
  onChangeIndex,
  onClearIndex,
  getToken,
  scannedFileName = '',
  onOpenManualIndex,
  onDismissScanned,
}) => {
  const [folderId, setFolderId] = useState(null);
  const [query, setQuery] = useState('');
  const indexCandidate = useMemo(
    () => (hasIndex || isLoading || pickingIndex ? null : findIndexCandidate(items, dismissedIds)),
    [hasIndex, isLoading, pickingIndex, items, dismissedIds],
  );

  useEffect(() => {
    if (!indexCandidate?.name) return;
    Logger.info(`Detected candidate drawing list PDF: ${indexCandidate.name}`);
  }, [indexCandidate?.id, indexCandidate?.name]);

  const byId = useMemo(() => new Map((items || []).map((item) => [item.id, item])), [items]);

  const rootFolderId = useMemo(() => {
    const folders = (items || []).filter((item) => item.type === 'FOLDER');
    const roots = folders.filter((folder) => !folder.parentId || !byId.has(folder.parentId));
    return roots.length === 1 ? roots[0].id : '';
  }, [items, byId]);

  const currentFolderId = folderId === null ? rootFolderId : folderId;

  const crumbs = useMemo(() => {
    const trail = [];
    let cursor = byId.get(currentFolderId);
    const seen = new Set();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      trail.unshift({ id: cursor.id, label: cursor.name });
      cursor = byId.get(cursor.parentId);
    }
    const rootLabel = projectName || 'Root';
    if (trail.length === 0 || trail[0].id !== rootFolderId) {
      trail.unshift({ id: rootFolderId, label: rootLabel });
    } else {
      trail[0] = { ...trail[0], label: rootLabel };
    }
    return trail;
  }, [byId, currentFolderId, projectName, rootFolderId]);

  const needle = String(query || '').trim().toLowerCase();

  const folders = useMemo(() => {
    if (needle) return [];
    return (items || [])
      .filter((item) => item.type === 'FOLDER' && isChildOf(item, currentFolderId, byId, rootFolderId))
      .sort(byName);
  }, [items, currentFolderId, needle, byId, rootFolderId]);

  const files = useMemo(() => {
    const pdfs = (items || []).filter((item) => item.type !== 'FOLDER' && String(item.name).toLowerCase().endsWith('.pdf'));
    if (needle) {
      return pdfs
        .filter((file) => fileMatchesSearch(file, needle, lookupDescription, indexMap))
        .sort(byName);
    }
    return pdfs.filter((file) => isChildOf(file, currentFolderId, byId, rootFolderId)).sort(byName);
  }, [items, currentFolderId, needle, byId, rootFolderId, lookupDescription, indexMap]);

  const pdfCount = (items || []).filter((item) => item.type !== 'FOLDER' && String(item.name).toLowerCase().endsWith('.pdf')).length;

  const handleFileClick = (file) => {
    if (pickingIndex) {
      onIndexFile?.(file);
      return;
    }
    onSelectFile(file);
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="h5 mb-1">Browse files</h1>
            <p className="text-muted small mb-0">
              {projectName
                ? `${pdfCount} PDF${pdfCount === 1 ? '' : 's'} in ${projectName}, including subfolders.`
                : 'Open Plan Linker from a Trimble Connect project to browse drawings.'}
            </p>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            {canReturnToDrawing ? (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onReturnToDrawing}>
                Back to drawing
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
              onClick={onOpenSettings}
            >
              <ModusIcon name="gear" size="16px" />
              Settings
            </button>
          </div>
        </div>

        <DrawingIndexStatus
          sourceFileName={indexSourceName}
          indexCount={indexCount}
          isIndexing={isIndexing}
          pickingIndex={pickingIndex}
          bordered
          onChangeIndex={onChangeIndex}
          onClearIndex={onClearIndex}
        />

        <ScannedPdfAlert
          fileName={scannedFileName}
          onManualIndex={onOpenManualIndex}
          onDismiss={onDismissScanned}
        />

        {pickingIndex ? (
          <div className="alert alert-info" role="status">
            Select a PDF to use as the drawing index for this project.
          </div>
        ) : null}

        {indexCandidate ? (
          <div className="alert alert-info d-flex flex-wrap align-items-start justify-content-between gap-3" role="alert">
            <p className="mb-0 min-w-0">
              Vond &lsquo;{indexCandidate.name}&rsquo;. Wil je dit instellen als de tekening-index voor dit project?
            </p>
            <div className="d-flex gap-2 flex-shrink-0">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => onDismissIndex?.(indexCandidate)}
                disabled={isIndexing}
              >
                Negeren
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onIndexFile?.(indexCandidate)}
                disabled={isIndexing}
              >
                {isIndexing ? 'Indexeren…' : 'Indexeren'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div className="flex-grow-1 min-w-0">
            <BreadcrumbNav
              items={crumbs}
              onSelect={(id) => {
                setQuery('');
                setFolderId(id);
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
            onClick={onRefresh || onRetry}
            disabled={isLoading}
            title="Vernieuwen / Refresh"
            aria-label="Vernieuwen / Refresh"
          >
            <ModusIcon name="arrow-clockwise" size="16px" />
            <span className="d-none d-md-inline">Refresh</span>
          </button>
          <label className="visually-hidden" htmlFor="explorer-search">
            Search drawings
          </label>
          <input
            id="explorer-search"
            type="search"
            className="form-control form-control-sm file-filter"
            placeholder="Search names or descriptions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {isLoading ? <Spinner label="Loading project folders…" /> : null}

        {error ? (
          <EmptyState
            icon="warning"
            title="Folders could not be loaded"
            body={error.message}
            action={
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRetry}>
                Retry
              </button>
            }
          />
        ) : null}

        {!isLoading && !error && folders.length === 0 && files.length === 0 ? (
          <EmptyState
            icon="folder-open"
            title={needle ? 'No matching PDFs' : 'No PDFs in this folder'}
            body={
              needle
                ? 'Try another name or description, or clear the search to browse folders.'
                : 'Open a subfolder, or upload drawing PDFs to this project.'
            }
          />
        ) : null}

        {!isLoading && !error && (folders.length > 0 || files.length > 0) ? (
          <div className="file-list">
            <table className="table table-hover align-middle file-table">
              <caption className="visually-hidden">Project drawings</caption>
              <colgroup>
                <col className="file-table-col-thumb" />
                <col className="file-table-col-name" />
                <col className="file-table-col-meta" />
                <col className="file-table-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="file-table-thumb">
                    <span className="visually-hidden">Preview</span>
                  </th>
                  <th scope="col">Name</th>
                  <th scope="col" className="file-table-meta">
                    Size
                  </th>
                  <th scope="col" className="file-table-action">
                    <span className="visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {folders.map((folder) => (
                  <tr
                    key={folder.id}
                    className="file-table-row"
                    tabIndex={0}
                    aria-label={`Open folder ${folder.name}`}
                    onClick={() => {
                      setQuery('');
                      setFolderId(folder.id);
                    }}
                    onKeyDown={(event) =>
                      activateRow(event, () => {
                        setQuery('');
                        setFolderId(folder.id);
                      })
                    }
                  >
                    <td className="file-table-thumb">
                      <FileThumb folder />
                    </td>
                    <td className="file-table-info">
                      <div className="file-table-name">{folder.name}</div>
                      <div className="file-table-desc small">Folder</div>
                    </td>
                    <td className="file-table-meta">
                      <span className="visually-hidden">Folder</span>
                    </td>
                    <td className="file-table-action">
                      <ModusIcon name="caret-right" size="16px" extraClasses="text-muted" />
                    </td>
                  </tr>
                ))}
                {files.map((file) => {
                  const description = descriptionForFile(file, lookupDescription);
                  const sizeLabel = formatBytes(file.size);
                  const modifiedLabel = formatShortDate(file.modifiedOn);
                  const openLabel = pickingIndex ? `Use ${file.name} as drawing index` : `Open ${file.name}`;
                  return (
                    <tr
                      key={file.id}
                      className="file-table-row"
                      tabIndex={0}
                      aria-label={openLabel}
                      onClick={() => handleFileClick(file)}
                      onKeyDown={(event) => activateRow(event, () => handleFileClick(file))}
                    >
                      <td className="file-table-thumb">
                        <FileThumb file={file} getToken={getToken} />
                      </td>
                      <td className="file-table-info">
                        <div className="file-table-name">{file.name}</div>
                        {description ? <div className="file-table-desc small">{description}</div> : null}
                        {needle && file.path ? <div className="file-table-desc small">{file.path}</div> : null}
                      </td>
                      <td className="file-table-meta">
                        <div>{sizeLabel || '—'}</div>
                        {modifiedLabel ? <div className="small">{modifiedLabel}</div> : null}
                      </td>
                      <td className="file-table-action">
                        <ModusIcon name="caret-right" size="16px" extraClasses="text-muted" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <footer className="small text-muted mt-3 mb-0">
          {APP_NAME} v{APP_VERSION}
        </footer>
      </div>
    </div>
  );
};

export default FileExplorer;
