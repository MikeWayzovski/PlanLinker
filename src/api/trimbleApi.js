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
  return [];
};

const isPdfFile = (entry) => {
  const name = String(entry?.name || '').toLowerCase();
  const type = String(entry?.type || entry?.objectType || '').toUpperCase();
  if (type && type !== 'FILE') return false;
  return name.endsWith('.pdf');
};

const fileIdOf = (entry) => entry?.id || entry?.fileId || entry?.objectId || '';

const pathTextOf = (entry) => {
  if (typeof entry?.path === 'string') return entry.path;
  if (Array.isArray(entry?.path)) {
    return entry.path.map((part) => part?.name || part).join('/');
  }
  return entry?.parentPath || '';
};

const normalizeFile = (entry) => ({
  id: fileIdOf(entry),
  name: entry?.name || 'Untitled',
  type: entry?.type || entry?.objectType || 'FILE',
  versionId: entry?.versionId || entry?.version?.id || '',
  parentId: entry?.parentId || '',
  projectId: entry?.projectId || '',
  path: pathTextOf(entry),
  size: entry?.size || 0,
  modifiedOn: entry?.modifiedOn || entry?.updatedOn || '',
  raw: entry,
});

async function fetchJson(url, token) {
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    const detail = await readError(response);
    const error = new Error(`Trimble returned ${response.status}${detail ? `: ${detail}` : ''}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

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

/**
 * Full filesystem snapshot used as a search fallback and for the PDF picker.
 */
export const getProjectSnapshot = async (token, regionName, projectId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const url = `${baseUrl}${API_V20}/files/fs/snapshot?projectId=${encodeURIComponent(projectId)}&objectTypes=FILE,FOLDER&maxItems=100000`;
  const data = await fetchJson(url, token);
  return asArray(data);
};

export const listProjectPdfs = async (token, regionName, projectId) => {
  const snapshot = await getProjectSnapshot(token, regionName, projectId);
  return snapshot.filter(isPdfFile).map(normalizeFile);
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
    const snapshot = await getProjectSnapshot(token, regionName, projectId);
    results = snapshot.map(normalizeFile).filter((file) => file.id && matchesQuery(file, needle));
  }

  const pdfs = results.filter((file) => isPdfFile(file) || String(file.name).toLowerCase().includes(needle.toLowerCase()));
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
