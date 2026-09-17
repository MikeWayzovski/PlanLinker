import { useState, useEffect } from 'react';
import * as Extensions from 'trimble-connect-project-workspace-api';
import { Logger } from './logger';

export const OPEN_SETTINGS_COMMAND = 'open_settings';
export const MAIN_MENU_COMMAND = 'PLAN_LINKER_MAIN_MENU';
export const SETTINGS_EVENT = 'sheethop:open-settings';
export const EXPLORER_EVENT = 'planlinker:open-explorer';
export const REFRESH_FILES_EVENT = 'planlinker:refresh-files';

const commandName = (data) => {
  if (typeof data === 'string') return data;
  return data?.command || data?.name || data?.id || '';
};

const dispatchRefresh = () => {
  window.dispatchEvent(new CustomEvent(REFRESH_FILES_EVENT));
};

/**
 * Workspace API token listener for the Trimble Connect iframe bridge.
 * Project scope comes only from `project.getCurrentProject()`.
 */
export const useWorkspaceApi = () => {
  const [isEmbedded] = useState(window !== window.parent);
  const [workspaceApi, setWorkspaceApi] = useState(null);
  const [embeddedToken, setEmbeddedToken] = useState(null);
  const [embeddedProject, setEmbeddedProject] = useState(null);

  useEffect(() => {
    if (!isEmbedded) return undefined;

    const initWorkspace = async () => {
      try {
        const api = await Extensions.connect(
          window.parent,
          (event, args) => {
            if (event === 'extension.command') {
              const command = commandName(args.data);
              Logger.info(`Menu command: ${command}`);
              if (command === OPEN_SETTINGS_COMMAND) {
                window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
              } else if (command === MAIN_MENU_COMMAND) {
                window.dispatchEvent(new CustomEvent(EXPLORER_EVENT));
                dispatchRefresh();
              }
            } else if (event === 'extension.accessToken') {
              setEmbeddedToken(args.data);
            }
          },
          30000,
        );

        setWorkspaceApi(api);

        await api.ui.setMenu({
          title: 'Plan Linker',
          icon: `${window.location.origin}/sheethop-logo.svg`,
          command: MAIN_MENU_COMMAND,
        });

        const token = await api.extension.getPermission('accesstoken');
        if (token) setEmbeddedToken(token);

        const projectInfo = await api.project.getCurrentProject();
        Logger.info('Current project resolved via the Workspace API:', projectInfo);
        setEmbeddedProject(projectInfo);
      } catch (error) {
        Logger.error('Workspace API connection failed:', error.message);
      }
    };

    initWorkspace();

    let focusTimer = 0;
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return;
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(dispatchRefresh, 400);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isEmbedded]);

  return { isEmbedded, workspaceApi, embeddedToken, embeddedProject };
};

export default useWorkspaceApi;
