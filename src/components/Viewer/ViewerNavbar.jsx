import React from 'react';
import { ModusWcNavbar, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

const NAV_VISIBILITY = {
  ai: false,
  apps: false,
  help: false,
  logo: true,
  mainMenu: false,
  notifications: false,
  search: false,
  searchInput: false,
  user: false,
};

const ViewerNavbar = ({ title }) => (
  <ModusWcNavbar
    customClass="template-2d-viewer-navbar"
    logoName="trimble"
    mainMenuOpen={false}
    visibility={NAV_VISIBILITY}
  >
    <div slot="start" className="template-2d-viewer-navbar-slot">
      <ModusWcTypography hierarchy="p" size="md" weight="semibold" label="Plan Linker" />
    </div>
    <div slot="center" className="template-2d-viewer-navbar-slot">
      <ModusWcTypography hierarchy="p" size="md" label={title || '2D Viewer'} />
    </div>
  </ModusWcNavbar>
);

export default ViewerNavbar;
