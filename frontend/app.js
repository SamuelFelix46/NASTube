import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { html, useHashRoute, getUserToken, getCurrentUser, clearUserToken } from './lib/utils.js';
import { Toast, useToast, Layout } from './lib/components.js';
import { HomePage } from './pages/HomePage.js';
import { WatchPage } from './pages/WatchPage.js';
import { QueuePage } from './pages/QueuePage.js';
import { FavoritesPage } from './pages/FavoritesPage.js';
import { StatsPage } from './pages/StatsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AuthPage } from './pages/AuthPage.js';

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const { route, id } = useHashRoute();
  const { toasts, toast } = useToast();

  if (!getUserToken()) {
    return html`
      <${Toast} toasts=${toasts}/>
      <${AuthPage} onLogin=${(u) => { setUser(u); }} />
    `;
  }

  const doLogout = () => {
    const tok = getUserToken();
    clearUserToken();
    setUser(null);
    if (tok) fetch('/api/auth/logout', { method: 'POST', headers: { 'X-User-Token': tok } }).catch(() => {});
  };

  let page;
  switch (route) {
    case 'watch': page = html`<${WatchPage} id=${id} toast=${toast}/>`; break;
    case 'queue': page = html`<${QueuePage} toast=${toast}/>`; break;
    case 'favorites': page = html`<${FavoritesPage}/>`; break;
    case 'stats': page = html`<${StatsPage} toast=${toast}/>`; break;
    case 'settings': page = html`<${SettingsPage} toast=${toast}/>`; break;
    default: page = html`<${HomePage} toast=${toast}/>`;
  }
  return html`
    <${Toast} toasts=${toasts}/>
    <${Layout} toast=${toast} user=${user} onLogout=${doLogout}>${page}</${Layout}>
  `;
}

createRoot(document.getElementById('app')).render(html`<${App}/>`);
