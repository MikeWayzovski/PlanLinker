import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@trimble-oss/trimble-id-react';

import LoginScreen from './components/Auth/LoginScreen';
import UserMenu from './components/Auth/UserMenu';
import ToastHost from './components/Modus/ToastHost';
import Spinner from './components/Modus/Spinner';
import EmptyState from './components/Modus/EmptyState';
import ModusIcon from './components/Modus/ModusIcon';
import PDFViewer from './components/Viewer/PDFViewer';
import FileExplorer from './components/FileExplorer/FileExplorer';
import MatchPicker from './components/Viewer/MatchPicker';
import SettingsView from './components/Settings/SettingsView';

import { useToast } from './hooks/useToast';
import { useSettings } from './hooks/useSettings';
import { useDrawingSearch } from './hooks/useDrawingSearch';
import { useWorkspaceApi, SETTINGS_EVENT } from './utils/workspaceBridge';
import { resolveAccessToken, isTokenUnavailable, clearCachedToken } from './utils/accessToken';
import { isTidConfigured } from './api/client';
import { getProjects, getCurrentUser, getProjectEntries } from './api/trimbleApi';
import { Logger } from './utils/logger';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from './appInfo';

const revokeObjectUrl = (url) => {
  if (url) URL.revokeObjectURL(url);
};

function App() {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently, loginWithRedirect, logout, error: authError } =
    useAuth();
  const { isEmbedded, workspaceApi, embeddedToken, embeddedProject } = useWorkspaceApi();
  const { settings, updateSetting } = useSettings();
  const { toasts, showToast, dismissToast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [projectItems, setProjectItems] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState(null);

  const [history, setHistory] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingMatches, setPendingMatches] = useState(null);
  const [lookupLabel, setLookupLabel] = useState('');

  const hasAccess = isAuthenticated || (isEmbedded && Boolean(embeddedToken));
  const region = settings.region;
  const projectId = embeddedProject?.id || selectedProjectId || projects[0]?.id || '';
  const selectedProject =
    (embeddedProject?.id === projectId ? embeddedProject : null) ||
    projects.find((project) => project.id === projectId);

  const getToken = useCallback(
    () =>
      resolveAccessToken({
        isAuthenticated,
        getAccessTokenSilently,
        isEmbedded,
        embeddedToken,
        workspaceApi,
      }),
    [isAuthenticated, getAccessTokenSilently, isEmbedded, embeddedToken, workspaceApi],
  );

  const { search, download, isSearching } = useDrawingSearch({
    getToken,
    region,
    projectId,
    fallbackFolder: settings.fallbackFolder,
  });

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(SETTINGS_EVENT, openSettings);

    const blockBrowserZoom = (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    window.addEventListener('wheel', blockBrowserZoom, { passive: false, capture: true });
    window.addEventListener('gesturestart', blockBrowserZoom, { passive: false, capture: true });
    window.addEventListener('gesturechange', blockBrowserZoom, { passive: false, capture: true });

    return () => {
      window.removeEventListener(SETTINGS_EVENT, openSettings);
      window.removeEventListener('wheel', blockBrowserZoom, { capture: true });
      window.removeEventListener('gesturestart', blockBrowserZoom, { capture: true });
      window.removeEventListener('gesturechange', blockBrowserZoom, { capture: true });
    };
  }, []);

  const reportError = useCallback(
    (error, fallbackMessage) => {
      if (isTokenUnavailable(error)) {
        showToast('Sign in to continue.', 'warning');
        return;
      }
      showToast(fallbackMessage || error.message, 'danger');
    },
    [showToast],
  );

  const loadProjects = useCallback(async () => {
    if (!hasAccess) return;
    setIsLoadingProjects(true);
    setProjectsError(null);
    try {
      const token = await getToken();
      const loaded = await getProjects(token, region);
      setProjects(loaded);
    } catch (error) {
      Logger.error('Could not load projects', error.message);
      setProjects([]);
      setProjectsError(error);
      reportError(error, 'Projects could not be loaded.');
    } finally {
      setIsLoadingProjects(false);
    }
  }, [hasAccess, getToken, region, reportError]);

  useEffect(() => {
    // Fetch-on-dependency-change: the loading flag has to flip before the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!hasAccess) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const profile = await getCurrentUser(token);
        if (!cancelled) setCurrentUser(profile);
      } catch (error) {
        Logger.warn('Could not identify the signed-in user', error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, getToken]);

  const loadFiles = useCallback(async () => {
    if (!hasAccess || !projectId) {
      setProjectItems([]);
      return;
    }
    setIsLoadingFiles(true);
    setFilesError(null);
    try {
      const token = await getToken();
      const items = await getProjectEntries(token, region, projectId);
      setProjectItems(items);
    } catch (error) {
      Logger.error('Could not list project folders', error.message);
      setProjectItems([]);
      setFilesError(error);
      reportError(error, 'Project folders could not be loaded.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [hasAccess, projectId, getToken, region, reportError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFiles();
  }, [loadFiles]);

  useEffect(
    () => () => {
      revokeObjectUrl(currentSheet?.objectUrl);
      history.forEach((entry) => revokeObjectUrl(entry.objectUrl));
    },
    // Unmount-only cleanup for object URLs created during the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const openFile = useCallback(
    async (file, { pushCurrent = false, resetHistory = false } = {}) => {
      setLookupLabel(`Opening ${file.name}…`);
      try {
        const blob = await download(file);
        const objectUrl = URL.createObjectURL(blob);
        const nextSheet = {
          id: file.id,
          name: file.name,
          path: file.path,
          versionId: file.versionId,
          objectUrl,
        };
        const previous = currentSheet;
        if (resetHistory) {
          setHistory((stack) => {
            stack.forEach((entry) => revokeObjectUrl(entry.objectUrl));
            return [];
          });
          if (!pushCurrent) revokeObjectUrl(previous?.objectUrl);
        } else if (pushCurrent && previous) {
          setHistory((stack) => [...stack, previous]);
        } else {
          revokeObjectUrl(previous?.objectUrl);
        }
        setCurrentSheet(nextSheet);
        setExplorerOpen(false);
        setSettingsOpen(false);
      } catch (error) {
        reportError(error, `Could not open ${file.name}.`);
      } finally {
        setLookupLabel('');
      }
    },
    [download, reportError, currentSheet],
  );

  const handleHotspot = useCallback(
    async (spot) => {
      if (!projectId) {
        showToast('Select a project before looking up drawings.', 'warning');
        return;
      }
      setLookupLabel(`Searching for ${spot.code}…`);
      try {
        const matches = await search(spot.code);
        if (matches.length === 0) {
          showToast(`No drawing matched ${spot.code}.`, 'warning');
          return;
        }
        if (matches.length === 1) {
          await openFile(matches[0], { pushCurrent: true });
          return;
        }
        setPendingMatches({ code: spot.code, files: matches });
      } catch (error) {
        reportError(error, `Could not look up ${spot.code}.`);
      } finally {
        setLookupLabel('');
      }
    },
    [projectId, search, openFile, showToast, reportError],
  );

  const handleBack = useCallback(() => {
    setHistory((stack) => {
      if (stack.length === 0) return stack;
      const next = [...stack];
      const previous = next.pop();
      setCurrentSheet((current) => {
        revokeObjectUrl(current?.objectUrl);
        return previous;
      });
      return next;
    });
  }, []);

  const handleCloseSheet = useCallback(() => {
    setCurrentSheet((current) => {
      revokeObjectUrl(current?.objectUrl);
      return null;
    });
    history.forEach((entry) => revokeObjectUrl(entry.objectUrl));
    setHistory([]);
    setExplorerOpen(true);
  }, [history]);

  const handleSignOut = useCallback(() => {
    clearCachedToken();
    if (typeof logout === 'function') logout();
  }, [logout]);

  const source = useMemo(
    () => (currentSheet?.objectUrl ? { url: currentSheet.objectUrl } : null),
    [currentSheet],
  );

  const callbackPath = window.location.pathname.replace(/\/$/, '') || '/';
  const isAuthCallback =
    callbackPath === '/callback' && Boolean(new URLSearchParams(window.location.search).get('code'));

  if (!isEmbedded && !isAuthenticated) {
    return (
      <LoginScreen
        isLoading={isAuthLoading}
        isCallback={isAuthCallback}
        isConfigured={isTidConfigured}
        error={authError?.message}
        onLogin={() => loginWithRedirect()}
      />
    );
  }

  const chrome = (
    <header className="navbar navbar-expand bg-body border-bottom px-3 py-2 flex-shrink-0 app-chrome">
      <span className="navbar-brand d-flex align-items-center gap-2 me-auto mb-0">
        <ModusIcon name="file-pdf" size="26px" extraClasses="text-primary" />
        <span className="fw-bold">{APP_NAME}</span>
        <span className="d-none d-lg-inline text-muted small fw-normal">{APP_TAGLINE}</span>
      </span>
      <div className="d-flex align-items-center gap-2">
        <span className="small text-muted d-none d-md-inline">v{APP_VERSION}</span>
        <UserMenu user={currentUser} onSignOut={isEmbedded ? null : handleSignOut} />
      </div>
    </header>
  );

  const showSettings = settingsOpen;
  const showExplorer = !settingsOpen && (!currentSheet || explorerOpen);
  const showViewer = Boolean(currentSheet) && !settingsOpen && !explorerOpen;
  const showChrome = !showViewer;

  return (
    <div className="app-root d-flex flex-column">
      {showChrome ? chrome : null}

      {showSettings ? (
        <main className="flex-grow-1 min-h-0 overflow-auto p-3 p-lg-4">
          <div className="mx-auto settings-wrap">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h1 className="h4 mb-0">Settings</h1>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSettingsOpen(false)}>
                {currentSheet ? 'Back to drawing' : 'Back to files'}
              </button>
            </div>
            <SettingsView
              settings={settings}
              updateSetting={updateSetting}
              showToast={showToast}
              projects={projects}
              embeddedProject={embeddedProject}
              selectedProjectId={projectId}
              onProjectChange={(id) => {
                setSelectedProjectId(id);
                handleCloseSheet();
              }}
            />
          </div>
        </main>
      ) : null}

      {currentSheet ? (
        <div
          className={showViewer ? 'viewer-host d-flex flex-column flex-grow-1 min-h-0' : 'viewer-parked d-flex flex-column'}
          aria-hidden={!showViewer}
          inert={!showViewer ? true : undefined}
        >
          <PDFViewer
            key={currentSheet.id}
            source={source}
            sourceKey={currentSheet.id}
            title={currentSheet.name}
            canGoBack={history.length > 0}
            onBack={handleBack}
            onBrowseFiles={() => setExplorerOpen(true)}
            codeRegex={settings.codeRegex}
            showPanel={settings.showHotspotPanel}
            onTogglePanel={() => updateSetting('showHotspotPanel', !settings.showHotspotPanel)}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((open) => !open)}
            onHotspotClick={handleHotspot}
            isBusy={isSearching || Boolean(lookupLabel)}
            busyLabel={lookupLabel || 'Looking up drawing…'}
          />
        </div>
      ) : null}

      {showExplorer && isLoadingProjects ? (
        <main className="flex-grow-1 min-h-0 overflow-auto p-3 p-lg-4">
          <div className="mx-auto picker-wrap">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <Spinner label="Loading projects…" />
              </div>
            </div>
          </div>
        </main>
      ) : null}

      {showExplorer && projectsError ? (
        <main className="flex-grow-1 min-h-0 overflow-auto p-3 p-lg-4">
          <div className="mx-auto picker-wrap">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <EmptyState
                  icon="warning"
                  title="Projects could not be loaded"
                  body={projectsError.message}
                  action={
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadProjects}>
                      Retry
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </main>
      ) : null}

      {!isLoadingProjects && !projectsError ? (
        <main
          className={showExplorer ? 'flex-grow-1 min-h-0 overflow-auto p-3 p-lg-4' : 'd-none'}
          aria-hidden={!showExplorer}
          inert={!showExplorer ? true : undefined}
        >
          <div className="mx-auto picker-wrap">
            <FileExplorer
              key={projectId}
              projectName={selectedProject?.name}
              items={projectItems}
              isLoading={isLoadingFiles}
              error={filesError}
              onRetry={loadFiles}
              onSelectFile={(file) => openFile(file, { resetHistory: true })}
              onOpenSettings={() => setSettingsOpen(true)}
              canReturnToDrawing={Boolean(currentSheet)}
              onReturnToDrawing={() => setExplorerOpen(false)}
            />
          </div>
        </main>
      ) : null}
      {pendingMatches ? (
        <MatchPicker
          code={pendingMatches.code}
          matches={pendingMatches.files}
          onSelect={(file) => {
            setPendingMatches(null);
            openFile(file, { pushCurrent: true });
          }}
          onCancel={() => setPendingMatches(null)}
        />
      ) : null}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
