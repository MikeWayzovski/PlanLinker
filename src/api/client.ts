import { TIDClient } from '@trimble-oss/trimble-id-react';

const configurationEndpoint = import.meta.env.VITE_CONFIGURATION_ENDPOINT;
const clientId = import.meta.env.VITE_CLIENT_ID;

const envScopes = String(import.meta.env.VITE_SCOPES || '')
  .split(/[,\s]+/)
  .filter(Boolean);

// openid is required for the id_token the SDK decodes after the PKCE exchange.
const scopes = envScopes.includes('openid') ? envScopes : ['openid', ...envScopes];

/** Trimble ID is only needed for the standalone app, not inside the Trimble Connect iframe. */
export const isTidConfigured = Boolean(configurationEndpoint && clientId);

const origin = window.location.origin;
const redirectUrl = import.meta.env.VITE_REDIRECT_URL || `${origin}/callback`;
const logoutRedirectUrl = import.meta.env.VITE_LOGOUT_REDIRECT_URL || `${origin}/logout-callback`;

if (!isTidConfigured) {
  console.error(
    'Trimble ID is not configured: set VITE_CONFIGURATION_ENDPOINT, VITE_CLIENT_ID and ' +
      'VITE_SCOPES in the build environment and redeploy. Sign-in stays unavailable until then; ' +
      'embedded in Trimble Connect the extension keeps working through the Workspace token.',
  );
}

// The constructor throws on an empty configurationEndpoint or clientId, and it runs while this
// module is imported - before React renders anything. Without these fallbacks a missing TID
// config would also break embedded mode, which gets its token from the Workspace API and never
// touches Trimble ID. `.invalid` is reserved (RFC 2606) and never resolves, so no stray request
// leaves for a real host.
const tidClient = new TIDClient({
  config: {
    configurationEndpoint: configurationEndpoint || 'https://tid-not-configured.invalid/.well-known/openid-configuration',
    clientId: clientId || 'tid-not-configured',
    redirectUrl,
    logoutRedirectUrl,
    scopes,
  },
});

export default tidClient;
