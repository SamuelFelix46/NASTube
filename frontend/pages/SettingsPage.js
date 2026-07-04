import React, { useEffect, useState } from 'react';
import { html, I, api, getToken, setToken, getCurrentUser, userColor } from '../lib/utils.js';
import { LoadingGrid } from '../lib/components.js';

export function SettingsPage({ toast }) {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const user = getCurrentUser();
  useEffect(() => { api('/api/settings', { auth: false }).then(setS); }, []);
  const save = async () => {
    setSaving(true);
    try { const r = await api('/api/settings', { method: 'PUT', body: JSON.stringify(s) }); setS(r); toast('Paramètres enregistrés', 'success'); }
    catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };
  if (!s) return html`<div class="p-6"><${LoadingGrid}/></div>`;

  const avatarColor = user?.avatar || userColor(user?.id || 0);
  const field = (k, label, type = 'number', help) => html`
    <label class="block">
      <span class="text-sm text-mute font-medium">${label}</span>
      ${type === 'checkbox'
        ? html`<div class="mt-1.5"><input type="checkbox" checked=${!!s[k]} onChange=${(e) => setS({ ...s, [k]: e.target.checked })}
            class="w-4 h-4 rounded accent-brand cursor-pointer"/></div>`
        : html`<input type=${type} value=${s[k] ?? ''} onChange=${(e) => setS({ ...s, [k]: type === 'number' ? Number(e.target.value) : e.target.value })}
            class="mt-1.5 w-full bg-bg3 border border-line/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 transition-colors"/>`}
      ${help && html`<span class="text-xs text-mute/60 mt-1 block">${help}</span>`}
    </label>`;
  return html`
    <div class="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 class="text-xl font-bold mb-6">Paramètres</h1>

      ${user && html`
        <div class="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-5 border border-line/30 mb-6">
          <h2 class="text-sm font-semibold text-mute uppercase tracking-wider mb-4">Mon compte</h2>
          <div class="flex items-center gap-4">
            <div style=${{ width: 48, height: 48, background: avatarColor }}
              class="rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg">${user.username[0].toUpperCase()}</div>
            <div>
              <div class="font-semibold text-txt">${user.username}</div>
              <div class="text-sm text-mute">${user.email}</div>
            </div>
          </div>
        </div>
      `}

      <div class="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-line/30">
        <div class="grid gap-5 md:grid-cols-2">
          ${field('max_quality', 'Qualité max', 'number', '720 · 1080 · 1440 · 2160')}
          ${field('max_concurrent', 'Téléchargements simultanés')}
          ${field('min_free_gb', 'Espace libre à préserver (Go)')}
          ${field('max_total_gb', 'Taille max bibliothèque (Go)')}
          ${field('keep_days', 'Jours de conservation', 'number', 'Les favoris ne sont jamais supprimés.')}
          ${field('scan_interval_min', 'Fréquence scan recos (min)')}
          ${field('clean_interval_hours', 'Fréquence nettoyage (h)')}
          ${field('enable_shorts', 'Autoriser les Shorts', 'checkbox')}
          ${field('enable_playlists', 'Autoriser les playlists', 'checkbox')}
          ${field('cookies_from_browser', 'Cookies navigateur', 'text', 'ex: chrome, firefox, edge — laisse vide si aucun')}
        </div>
      </div>
      <button onClick=${save} disabled=${saving}
        class="mt-6 px-6 py-3 rounded-xl bg-brand hover:bg-brand2 transition-all font-medium shadow-lg shadow-brand/20 disabled:opacity-50">
        ${saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
      </button>
      <div class="mt-6 bg-bg2 rounded-2xl p-5 border border-line/30 text-sm text-mute">
        <div class="font-semibold text-txt mb-1">Jeton API</div>
        Les modifications nécessitent le jeton défini côté serveur (fichier <code class="text-brand">.env</code>).
        <div class="mt-3"><button class="text-brand hover:text-brand2 underline transition-colors" onClick=${() => { const t = prompt('Jeton API', getToken()); if (t !== null) setToken(t); }}>${getToken() ? 'Modifier le jeton local' : 'Configurer le jeton local'}</button></div>
      </div>
    </div>`;
}