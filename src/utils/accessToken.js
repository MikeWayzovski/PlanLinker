import { Logger } from './logger';

let cachedToken = null;

export class TokenUnavailableError extends Error {
  constructor(message = 'No valid access token available.') {
    super(message);
    this.name = 'TokenUnavailableError';
    this.code = 'NO_TOKEN';
  }
}

export const isTokenUnavailable = (error) =>
  error instanceof TokenUnavailableError || error?.code === 'NO_TOKEN';

export const clearCachedToken = () => {
  cachedToken = null;
};

/**
 * Reads a token that is already available in this session, or asks Trimble ID for one.
 * Never throws: returns null when no token can be obtained.
 */
export const readStoredToken = async (getAccessTokenSilently) => {
  if (cachedToken) return cachedToken;
  if (typeof getAccessTokenSilently !== 'function') return null;

  try {
    const token = await getAccessTokenSilently();
    if (token) cachedToken = token;
    return token || null;
  } catch (error) {
    Logger.warn('Could not obtain an OAuth token:', error.message || error);
    return null;
  }
};

/**
 * Token resolution order:
 * 1. Trimble ID (PKCE) access token from the standalone login.
 * 2. Trimble Connect Workspace token when embedded in the iframe.
 * 3. Otherwise TokenUnavailableError, so the caller can prompt for sign-in
 *    instead of surfacing an uncaught exception.
 */
export const resolveAccessToken = async ({
  isAuthenticated,
  getAccessTokenSilently,
  isEmbedded,
  embeddedToken,
  workspaceApi,
}) => {
  if (isAuthenticated && typeof getAccessTokenSilently === 'function') {
    try {
      const oauthToken = await getAccessTokenSilently();
      if (oauthToken) {
        cachedToken = oauthToken;
        return oauthToken;
      }
    } catch (error) {
      Logger.warn('OAuth token expired or missing, trying the Workspace token:', error.message || error);
    }
  }

  if (embeddedToken) {
    cachedToken = embeddedToken;
    return embeddedToken;
  }

  if (isEmbedded && workspaceApi?.extension?.getPermission) {
    try {
      const workspaceToken = await workspaceApi.extension.getPermission('accesstoken');
      if (workspaceToken) {
        cachedToken = workspaceToken;
        return workspaceToken;
      }
    } catch (error) {
      Logger.warn('Could not obtain the Workspace token:', error.message || error);
    }
  }

  if (cachedToken) return cachedToken;

  throw new TokenUnavailableError();
};
