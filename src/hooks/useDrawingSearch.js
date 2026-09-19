import { useCallback, useState } from 'react';
import { searchProjectFiles, downloadFileBlob } from '../api/trimbleApi';
import { Logger } from '../utils/logger';

/**
 * Resolve a drawing code to a PDF file, then fetch a blob for the viewer.
 */
export const useDrawingSearch = ({ getToken, region, projectId, fallbackFolder }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(
    async (code, { silent = false } = {}) => {
      if (!silent) {
        setIsSearching(true);
        setError(null);
      }
      try {
        const token = await getToken();
        const matches = await searchProjectFiles(token, region, projectId, code, fallbackFolder);
        return matches;
      } catch (searchError) {
        Logger.error(`Search for ${code} failed`, searchError.message);
        if (!silent) setError(searchError);
        throw searchError;
      } finally {
        if (!silent) setIsSearching(false);
      }
    },
    [getToken, region, projectId, fallbackFolder],
  );

  const download = useCallback(
    async (file) => {
      const token = await getToken();
      const blob = await downloadFileBlob(token, region, file.id, file.versionId);
      return blob;
    },
    [getToken, region],
  );

  return { search, download, isSearching, error };
};
