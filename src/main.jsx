import React from 'react';
import ReactDOM from 'react-dom/client';
import { TIDProvider } from '@trimble-oss/trimble-id-react';
import { ModusWcThemeProvider, setAssetPath } from '@trimble-oss/moduswebcomponents-react';

import '@trimble-oss/moduswebcomponents/modus-wc-styles.css';
import '@trimble-oss/modus-bootstrap/dist/css/modus-bootstrap.min.css';
import '@trimble-oss/modus-icons/dist/modus-solid/fonts/modus-icons.css';
import '@trimble-oss/modus-icons-css/css/modus-icons.css';
import './index.css';

import App from './App.jsx';
import tidClient from './api/client.ts';

const assetBase = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
setAssetPath(`${window.location.origin}${assetBase}`);

const stripAuthParams = (target = '/') => {
  window.history.replaceState({}, document.title, target);
};

const handleRedirect = (authState) => {
  const returnTo = authState?.returnTo;
  const next =
    !returnTo || returnTo.startsWith('/callback') || returnTo.startsWith('/logout-callback')
      ? '/'
      : returnTo;
  stripAuthParams(next);
};

if (window.location.pathname.replace(/\/$/, '') === '/logout-callback') {
  stripAuthParams('/');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <TIDProvider tidClient={tidClient} onRedirectCallback={handleRedirect} checkRedirectUrlMatch>
    <ModusWcThemeProvider>
      <App />
    </ModusWcThemeProvider>
  </TIDProvider>,
);
