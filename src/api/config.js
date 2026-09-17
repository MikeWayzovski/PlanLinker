/**
 * Trimble Connect regional hosts. North America is the master/default region.
 * Mirrors https://app.connect.trimble.com/tc/api/2.0/regions
 */
export const REGIONS = [
  { id: 'northAmerica', label: 'North America', baseUrl: 'https://app.connect.trimble.com' },
  { id: 'europe', label: 'Europe', baseUrl: 'https://app21.connect.trimble.com' },
  { id: 'unitedKingdom', label: 'United Kingdom', baseUrl: 'https://app22.connect.trimble.com' },
  { id: 'asiaPacific', label: 'Asia Pacific', baseUrl: 'https://app31.connect.trimble.com' },
  { id: 'australia', label: 'Australia', baseUrl: 'https://app32.connect.trimble.com' },
];

const ALIASES = {
  na: 'northAmerica',
  us: 'northAmerica',
  northamerica: 'northAmerica',
  'north-america': 'northAmerica',
  eu: 'europe',
  europe: 'europe',
  europa: 'europe',
  uk: 'unitedKingdom',
  gb: 'unitedKingdom',
  'eu-gb': 'unitedKingdom',
  unitedkingdom: 'unitedKingdom',
  'united-kingdom': 'unitedKingdom',
  ap: 'asiaPacific',
  asia: 'asiaPacific',
  asiapacific: 'asiaPacific',
  aus: 'australia',
  'ap-au': 'australia',
  australia: 'australia',
};

export const normalizeRegion = (regionName) => {
  const key = String(regionName || '').toLowerCase().trim();
  return ALIASES[key] || 'northAmerica';
};

export const inferRegionFromHost = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  if (host.includes('app21')) return 'europe';
  if (host.includes('app22')) return 'unitedKingdom';
  if (host.includes('app31')) return 'asiaPacific';
  if (host.includes('app32')) return 'australia';
  return 'northAmerica';
};

/**
 * Resolve the Connect API region from the Workspace current project, not a user picker.
 */
export const regionFromProject = (project) => {
  const loc = project?.location || project?.region || '';
  if (typeof loc === 'string' && /^https?:\/\//i.test(loc)) {
    try {
      return inferRegionFromHost(new URL(loc).hostname);
    } catch {
      /* fall through */
    }
  }
  if (loc) return normalizeRegion(loc);
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      return inferRegionFromHost(new URL(document.referrer).hostname);
    } catch {
      /* fall through */
    }
  }
  return 'northAmerica';
};

export const getBaseUrlForRegion = (regionName) => {
  const id = normalizeRegion(regionName);
  return REGIONS.find((region) => region.id === id).baseUrl;
};

/** User profiles are global and always served from the master region. */
export const GLOBAL_BASE_URL = 'https://app.connect.trimble.com';
