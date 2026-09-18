import React, { useMemo, useState } from 'react';
import ModusIcon from '../Modus/ModusIcon';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';
import BreadcrumbNav from './BreadcrumbNav';
import { APP_NAME, APP_VERSION } from '../../appInfo';
import {
  descriptionForFile,
  fileMatchesSearch,
  findIndexCandidate,
} from '../../utils/drawingListParser';

const formatBytes = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
};

const byName = (a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' });

const isChildOf = (item, folderId, byId, rootFolderId) => {
  if (folderId && item.id === folderId) return false;
  const parentMissing = !item.parentId || !byId.has(item.parentId);
  if (!folderId) return parentMissing;
  if (item.parentId === folderId) return true;
  return parentMissing && folderId === rootFolderId;
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
}) => {
  const [folderId, setFolderId] = useState(null);
  const [query, setQuery] = useState('');
  const indexCandidate = useMemo(
    () => (hasIndex || isLoading ? null : findIndexCandidate(items, dismissedIds)),
    [hasIndex, isLoading, items, dismissedIds],
  );

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
          <ul className="list-group list-group-flush file-list">
            {folders.map((folder) => (
              <li key={folder.id} className="list-group-item px-0">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-1 py-2"
                  onClick={() => {
                    setQuery('');
                    setFolderId(folder.id);
                  }}
                >
                  <ModusIcon name="folder-simple" size="20px" extraClasses="text-primary flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="d-block text-truncate fw-semibold">{folder.name}</span>
                    <span className="d-block small text-muted">Folder</span>
                  </span>
                </button>
              </li>
            ))}
            {files.map((file) => {
              const description = descriptionForFile(file, lookupDescription);
              return (
                <li key={file.id} className="list-group-item px-0">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-1 py-2"
                    onClick={() => onSelectFile(file)}
                  >
                    <ModusIcon name="file-pdf" size="20px" extraClasses="text-danger flex-shrink-0" />
                    <span className="min-w-0 flex-grow-1">
                      <span className="d-block text-truncate fw-semibold">{file.name}</span>
                      {description ? (
                        <span className="d-block small text-muted text-truncate">{description}</span>
                      ) : null}
                      <span className="d-block small text-muted text-truncate">
                        {[needle ? file.path : '', formatBytes(file.size)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <footer className="small text-muted mt-3 mb-0">
          {APP_NAME} v{APP_VERSION}
        </footer>
      </div>
    </div>
  );
};

export default FileExplorer;
