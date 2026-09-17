import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CODE_REGEX } from '../utils/drawingCodes';

const STORAGE_KEY = 'sheethop_settings';

const DEFAULTS = {
  region: 'europe',
  codeRegex: DEFAULT_CODE_REGEX,
  fallbackFolder: '',
  showHotspotPanel: true,
};

const read = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState(read);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  return { settings, updateSetting };
};
