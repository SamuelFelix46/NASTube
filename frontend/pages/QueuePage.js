import React, { useEffect, useState } from 'react';
import { html, I, api, thumbUrl, Icon } from '../lib/utils.js';

export function QueuePage({ toast }) {
  const [items, setItems] = useState([]);
  const load = async () => { try { setItems(await api('/api/queue', { auth: false })); } catch {} };
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, []);
  const retry = async (id) => { await api(`/api/videos/${id}/retry`, { method: 'POST' }); load(); };
  const remove = async (id) => { await api(`/api/videos/${id}`, { method: 'DELETE' }); load(); };
  const badge = (s) => ({
    queued: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    downloading: 'bg-blue-600/20 text-blue-400 border-blue-600/30 animate-pulse',
    error: 'bg-red-600/20 text-red-400 border-red-600/30',
  })[s] || 'bg-bg2 text-mute';
  return html`
    <div class="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 class="text-xl font-bold mb-6">File de téléchargement</h1>
      ${items.length === 0 ? html`
        <div class="text-center py-16">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-600/10 flex items-center justify-center">
            <${Icon} d=${I.check} size=${32} class="text-green-400"/>
          </div>
          <div class="text-lg font-medium text-mute">Rien en attente</div>
          <div class="text-sm text-mute/60 mt-1">Tous les téléchargements sont terminés.</div>
        </div>`
      : html`
        <div class="space-y-2">
          ${items.map((v) => html`
            <div key=${v.id} class="flex items-center gap-3 bg-bg2 rounded-xl p-3 border border-line/30 hover:border-line/60 transition-colors">
              <div class="w-28 aspect-video rounded-lg overflow-hidden bg-bg3 shrink-0 shadow-md">
                ${thumbUrl(v) ? html`<img src=${thumbUrl(v)} class="w-full h-full object-cover"/>` : html`<div class="w-full h-full flex items-center justify-center text-mute/30"><${Icon} d=${I.play} size=${20}/></div>`}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm clamp1">${v.title || v.url}</div>
                <div class="text-xs text-mute/60 mt-0.5 clamp1">${v.channel || v.url}</div>
                ${v.error && html`<div class="text-xs text-red-400 mt-1.5 bg-red-400/10 rounded-lg px-2 py-1">${v.error}</div>`}
              </div>
              <span class=${`text-xs font-medium px-2.5 py-1 rounded-lg border uppercase tracking-wider shrink-0 ${badge(v.status)}`}>${v.status}</span>
              ${v.status === 'error' && html`<button class="p-2 rounded-lg hover:bg-bg3 transition-colors shrink-0" onClick=${() => retry(v.id)} title="Réessayer"><${Icon} d=${I.reload} size=${16}/></button>`}
              <button class="p-2 rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors shrink-0" onClick=${() => remove(v.id)} title="Supprimer"><${Icon} d=${I.trash} size=${16}/></button>
            </div>`)}
        </div>`}
    </div>`;
}
