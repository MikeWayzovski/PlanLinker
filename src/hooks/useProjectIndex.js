import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeDrawingCode } from '../utils/drawingCodes';

const emptyState = {
  map: {},
  sourceFileName: '',
  sourceFileId: '',
  dismissedIds: [],
};

export const indexStorageKey = (projectId) => `planlinker_index_${projectId}`;

const compactKey = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const readStore = (projectId) => {
  if (!projectId) return { ...emptyState, dismissedIds: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(indexStorageKey(projectId)) || 'null');
    if (!raw || typeof raw !== 'object') return { ...emptyState, dismissedIds: [] };
    return {
      map: raw.map && typeof raw.map === 'object' ? raw.map : {},
      sourceFileName: String(raw.sourceFileName || ''),
      sourceFileId: String(raw.sourceFileId || ''),
      dismissedIds: Array.isArray(raw.dismissedIds) ? raw.dismissedIds.map(String) : [],
    };
  } catch {
    return { ...emptyState, dismissedIds: [] };
  }
};

export const useProjectIndex = (projectId) => {
  const [state, setState] = useState(() => readStore(projectId));

  useEffect(() => {
    // Reload when the Trimble Connect project changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStore(projectId));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(indexStorageKey(projectId), JSON.stringify(state));
  }, [projectId, state]);

  const setProjectIndex = useCallback((map, sourceFileName, sourceFileId = '') => {
    setState({
      map: map && typeof map === 'object' ? { ...map } : {},
      sourceFileName: String(sourceFileName || ''),
      sourceFileId: String(sourceFileId || ''),
      dismissedIds: [],
    });
  }, []);

  const lookupDescription = useCallback(
    (code) => {
      if (!code) return '';
      const map = state.map || {};
      const raw = String(code).toUpperCase().trim();
      const normalized = normalizeDrawingCode(raw);
      const compact = compactKey(raw);
      return map[code] || map[raw] || map[normalized] || map[compact] || '';
    },
    [state.map],
  );

  const clearIndex = useCallback(() => {
    setState({ ...emptyState, dismissedIds: [] });
  }, []);

  const dismissCandidate = useCallback((fileId) => {
    if (!fileId) return;
    setState((current) => ({
      ...current,
      dismissedIds: [...new Set([...(current.dismissedIds || []), String(fileId)])],
    }));
  }, []);

  const indexCount = useMemo(() => new Set(Object.values(state.map || {})).size, [state.map]);

  return {
    indexMap: state.map,
    sourceFileName: state.sourceFileName,
    sourceFileId: state.sourceFileId,
    dismissedIds: state.dismissedIds,
    hasIndex: indexCount > 0,
    indexCount,
    setProjectIndex,
    lookupDescription,
    clearIndex,
    dismissCandidate,
  };
};
