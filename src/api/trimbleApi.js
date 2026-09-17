import { getBaseUrlForRegion, GLOBAL_BASE_URL } from './config';
import { Logger } from '../utils/logger';

const API_V21 = '/tc/api/2.1';
const API_V20 = '/tc/api/2.0';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

const readError = async (response) => {
  const body = await response.text().catch(() => '');
  return body.trim();
};

const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.files)) return data.files;
  if (Array.isArray(data?.contents)) return data.contents;
  if (Array.isArray(data?.objects)) return data.objects;
  if (Array.isArray(data?.entries)) return data.entries;
  return [];
};

const fileIdOf = (entry) => entry?.id || entry?.fileId || entry?.objectId || '';

const typeOf = (entry) =>
  String(entry?.type || entry?.tp || entry?.objectType || '').toUpperCase();

const nameOf = (entry) =>
  entry?.name || entry?.nm || entry?.fileName || entry?.filename || 'Untitled';

const parentIdOf = (entry) =>
  entry?.parentId || entry?.pid || entry?.parent?.id || '';

const isPdfName = (name) => String(name || '').toLowerCase().endsWith('.pdf');

export const isPdfFile = (entry) => {
  const type = typeOf(entry);
  if (type && type !== 'FILE') return false;
  return isPdfName(nameOf(entry));
};

export const isFolderEntry = (entry) => typeOf(entry) === 'FOLDER';

const pathTextOf = (entry) => {
  if (typeof entry?.path === 'string') return entry.path;
  if (Array.isArray(entry?.path)) {
    return entry.path.map((part) => part?.name || part?.nm || part).join('/');
  }
  return entry?.parentPath || '';
};

/** Snapshot items use abbreviated keys (nm, tp, pid, vid, sz). Full APIs use long names. */
export const normalizeEntry = (entry) => ({
  id: fileIdOf(entry),
  name: nameOf(entry),
  type: typeOf(entry) || (isPdfName(nameOf(entry)) ? 'FILE' : ''),
  versionId: entry?.versionId || entry?.vid || entry?.version?.id || '',
  parentId: parentIdOf(entry),
  projectId: entry?.projectId || '',
  path: pathTextOf(entry),
  size: Number(entry?.size ?? entry?.sz ?? entry?.fileSize) || 0,
  modifiedOn: entry?.modifiedOn || entry?.updatedOn || '',
  raw: entry,
});

const normalizeFile = normalizeEntry;

async function fetchJson(url, token) {
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    const detail = await readError(response);
    const error = new Error(`Trimble returned ${response.status}${detail ? `: ${detail}` : ''}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

const nextPageUrl = (data, currentUrl) => {
  if (data?.nextLink) return data.nextLink;
  if (data?.nextPageLink) return data.nextPageLink;
  const token = data?.skipToken || data?.continuationToken || data?.nextPageToken;
  if (!token) return '';
  const next = new URL(currentUrl, 'https://connect.trimble.com');
  next.searchParams.set('skipToken', token);
  return next.toString();
};

export const getCurrentUser = async (token) => {
  try {
    const response = await fetch(`${GLOBAL_BASE_URL}${API_V20}/users/me`, { headers: authHeaders(token) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    Logger.warn('Could not load the signed-in user profile:', error.message);
    return null;
  }
};

export const getProjects = async (token, regionName) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  try {
    const data = await fetchJson(`${baseUrl}${API_V20}/projects`, token);
    const projects = asArray(data);
    Logger.info(`Loaded ${projects.length} projects from ${regionName}.`);
    return projects;
  } catch (error) {
    Logger.error(`Could not load projects from ${regionName}`, error.message);
    throw new Error(`Projects could not be loaded (${error.message}).`);
  }
};

export const getProjectDetails = async (token, regionName, projectId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  return fetchJson(`${baseUrl}${API_V20}/projects/${projectId}?fullyLoaded=true`, token);
};

const readRootId = (project) =>
  project?.rootId || project?.rootFolderId || project?.root?.id || '';

export const getProjectRootId = async (token, regionName, projectId, knownProject) => {
  const fromKnown = readRootId(knownProject);
  if (fromKnown) return fromKnown;
  const details = await getProjectDetails(token, regionName, projectId);
  const fromProject = readRootId(details);
  if (fromProject) return fromProject;
  throw new Error('This project has no root folder id (rootId).');
};

/**
 * Full filesystem snapshot used for the file explorer and PDF discovery.
 * Trimble abbreviates item fields: nm, tp, pid, vid, sz.
 */
export const getProjectSnapshot = async (token, regionName, projectId, options = {}) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const params = new URLSearchParams({
    projectId,
    objectTypes: options.objectTypes || 'FILE,FOLDER',
    maxItems: String(options.maxItems || 100000),
  });
  if (options.objectNames) params.set('objectNames', options.objectNames);

  const collected = [];
  let url = `${baseUrl}${API_V20}/files/fs/snapshot?${params.toString()}`;
  let guard = 0;

  while (url && guard < 20) {
    const data = await fetchJson(url, token);
    collected.push(...asArray(data));
    url = nextPageUrl(data, url);
    guard += 1;
  }

  Logger.info(`Loaded ${collected.length} filesystem item(s) from project ${projectId}.`);
  return collected;
};

const withReconstructedPaths = (snapshot) => {
  const entries = snapshot.map(normalizeEntry).filter((entry) => entry.id);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  return entries.map((entry) => {
    if (entry.path) return entry;
    const segments = [];
    let cursor = byId.get(entry.parentId);
    const seen = new Set();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      segments.unshift(cursor.name);
      cursor = byId.get(cursor.parentId);
    }
    return { ...entry, path: segments.join('/') };
  });
};

export const getProjectEntries = async (token, regionName, projectId) => {
  let entries = [];
  try {
    entries = withReconstructedPaths(await getProjectSnapshot(token, regionName, projectId));
  } catch (error) {
    Logger.warn('Filesystem snapshot failed; walking folders from the project root.', error.message);
  }

  const pdfs = entries.filter((entry) => entry.type !== 'FOLDER' && isPdfName(entry.name));
  if (pdfs.length > 0) return entries;

  const walked = await walkFoldersForPdfs(token, regionName, projectId);
  if (entries.length === 0) return walked;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  walked.forEach((entry) => {
    if (!byId.has(entry.id)) entries.push(entry);
  });
  return entries;
};

/**
 * Every PDF in the project, including files nested in subfolders.
 */
export const getProjectPdfFiles = async (token, regionName, projectId) => {
  const pdfs = (await getProjectEntries(token, regionName, projectId)).filter(
    (entry) => entry.type !== 'FOLDER' && isPdfName(entry.name),
  );
  if (pdfs.length > 0) return pdfs;

  try {
    const pdfSnapshot = await getProjectSnapshot(token, regionName, projectId, {
      objectTypes: 'FILE',
      objectNames: '.pdf',
    });
    return withReconstructedPaths(pdfSnapshot).filter((entry) => isPdfName(entry.name));
  } catch (error) {
    Logger.warn('PDF snapshot filter failed.', error.message);
    return [];
  }
};

export const listProjectPdfs = getProjectPdfFiles;

const walkFoldersForPdfs = async (token, regionName, projectId) => {
  const rootId = await getProjectRootId(token, regionName, projectId);
  const found = [];
  const queue = [rootId];
  const seen = new Set();

  while (queue.length > 0) {
    const folderId = queue.shift();
    if (!folderId || seen.has(folderId)) continue;
    seen.add(folderId);

    let children = [];
    try {
      children = await getFolderContents(token, regionName, projectId, folderId);
    } catch (error) {
      Logger.warn(`Could not list folder ${folderId}: ${error.message}`);
      continue;
    }

    children.forEach((entry) => {
      if (entry.type === 'FOLDER') queue.push(entry.id);
      else if (isPdfName(entry.name)) found.push(entry);
    });
  }

  return found;
};

/**
 * Children of a folder. Falls back to the project root when folderId is omitted.
 */
export const getFolderContents = async (token, regionName, projectId, folderId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const id = folderId || (await getProjectRootId(token, regionName, projectId));
  const encoded = encodeURIComponent(id);

  const urls = [
    `${baseUrl}${API_V21}/folders/${encoded}/items`,
    `${baseUrl}${API_V21}/projects/${encodeURIComponent(projectId)}/folders/${encoded}/items`,
    `${baseUrl}${API_V20}/folders/${encoded}/items`,
    `${baseUrl}${API_V20}/files?parentId=${encoded}`,
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const data = await fetchJson(url, token);
      return asArray(data).map(normalizeEntry).filter((entry) => entry.id);
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const snapshot = withReconstructedPaths(await getProjectSnapshot(token, regionName, projectId));
    const fromSnapshot = snapshot.filter((entry) => entry.parentId === id);
    if (fromSnapshot.length > 0) return fromSnapshot;
  } catch (error) {
    Logger.warn(`Could not fall back to the filesystem snapshot for folder ${id}.`, error.message);
  }

  if (lastError) throw lastError;
  return [];
};

const searchViaEndpoint = async (token, regionName, projectId, query) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const params = new URLSearchParams({
    query,
    projectId,
    type: 'FILE',
  });

  const urls = [
    `${baseUrl}${API_V21}/search?${params.toString()}`,
    `${baseUrl}${API_V20}/search?${params.toString()}`,
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const data = await fetchJson(url, token);
      return asArray(data).map(normalizeFile).filter((file) => file.id);
    } catch (error) {
      lastError = error;
      if (error.status && error.status !== 404) {
        Logger.warn(`Search at ${url} failed: ${error.message}`);
      }
    }
  }

  if (lastError) throw lastError;
  return [];
};

const matchesQuery = (file, query) => {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return false;
  const haystack = `${file.name} ${file.path}`.toLowerCase();
  return haystack.includes(needle);
};

const inFallbackFolder = (file, folderName) => {
  const needle = String(folderName || '').trim().toLowerCase();
  if (!needle) return true;
  return String(file.path || '').toLowerCase().includes(needle);
};

/**
 * Look up drawing files by code. Tries the Search API first, then the project snapshot.
 * When `fallbackFolder` is set, matching files in that folder are preferred.
 */
export const searchProjectFiles = async (token, regionName, projectId, query, fallbackFolder = '') => {
  const needle = String(query || '').trim();
  if (!needle) return [];
  if (!projectId) throw new Error('A project is required before searching for drawings.');

  let results = [];
  try {
    results = await searchViaEndpoint(token, regionName, projectId, needle);
  } catch (error) {
    Logger.warn('Search API was unavailable, falling back to the project snapshot.', error.message);
  }

  if (results.length === 0) {
    const entries = await getProjectEntries(token, regionName, projectId);
    results = entries.filter((file) => file.type !== 'FOLDER' && matchesQuery(file, needle));
  }

  const pdfs = results.filter((file) => isPdfName(file.name) || String(file.name).toLowerCase().includes(needle.toLowerCase()));
  const preferred = pdfs.filter((file) => inFallbackFolder(file, fallbackFolder));
  const ranked = (preferred.length ? preferred : pdfs).sort((a, b) => {
    const aExact = String(a.name).toLowerCase().startsWith(needle.toLowerCase()) ? 0 : 1;
    const bExact = String(b.name).toLowerCase().startsWith(needle.toLowerCase()) ? 0 : 1;
    return aExact - bExact || String(a.name).localeCompare(String(b.name));
  });

  Logger.info(`Search for "${needle}" returned ${ranked.length} file(s).`);
  return ranked;
};

const downloadUrlPaths = (fileId, versionId) => {
  const q = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';
  return [
    `/files/fs/${fileId}/downloadurl${q}`,
    `/files/${fileId}/downloadurl${q}`,
  ];
};

/**
 * Resolve a temporary pre-signed download URL for a file (Core API downloadurl).
 */
export const getFileDownloadUrl = async (token, regionName, fileId, versionId = '') => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const prefixes = [API_V21, API_V20];
  let lastError = null;

  for (const prefix of prefixes) {
    for (const path of downloadUrlPaths(fileId, versionId)) {
      try {
        const data = await fetchJson(`${baseUrl}${prefix}${path}`, token);
        const url = data?.url || data?.downloadUrl || data?.signedUrl;
        if (url) return url;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error('Trimble did not return a download URL for this file.');
};

/**
 * Download a file as a Blob using the pre-signed URL (no extra auth headers on the S3 hop).
 */
export const downloadFileBlob = async (token, regionName, fileId, versionId = '') => {
  const downloadUrl = await getFileDownloadUrl(token, regionName, fileId, versionId);
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Downloading the file failed (${response.status}).`);
  }
  return response.blob();
};
