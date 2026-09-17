import { useState, useEffect } from 'react';
import * as Extensions from 'trimble-connect-project-workspace-api';
import { Logger } from './logger';

export const OPEN_SETTINGS_COMMAND = 'open_settings';
export const SETTINGS_EVENT = 'sheethop:open-settings';

/**
 * Workspace API token listener for the Trimble Connect iframe bridge.
 * Mirrors the dual-token pattern used by SitePass and tc-project-cross-over.
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
              Logger.info(`Menu command: ${args.data}`);
              if (args.data === OPEN_SETTINGS_COMMAND) {
                window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
              }
            } else if (event === 'extension.accessToken') {
              setEmbeddedToken(args.data);
            }
          },
          30000,
        );

        setWorkspaceApi(api);

        await api.ui.setMenu({
          title: 'SheetHop',
          icon: `${window.location.origin}/sheethop-logo.svg`,
          command: 'SHEETHOP_MAIN_MENU',
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
  }, [isEmbedded]);

  return { isEmbedded, workspaceApi, embeddedToken, embeddedProject };
};

export default useWorkspaceApi;
