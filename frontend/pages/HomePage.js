import React, { useEffect, useState } from 'react';
import { html, I, api, nav, useHashRoute, Icon } from '../lib/utils.js';
import { VideoCard, LoadingGrid } from '../lib/components.js';

export function HomePage({ toast }) {
  const [videos, setVideos] = useState(null);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState('recent');
  const { params } = useHashRoute();
  const q = params.get('q') || '';
  const [openAdd, setOpenAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const load = async () => {
    try {
      const qs = new URLSearchParams({ status: 'done', sort });
      if (q) qs.set('q', q);
      setVideos(await api(`/api/videos?${qs}`, { auth: false }));
    } catch (e) { setErr(String(e)); }
  };
  useEffect(() => { load(); }, [sort, q]);

  const addOne = async () => {
    if (!addUrl.trim()) return;
    try {
      await api('/api/enqueue', { method: 'POST', body: JSON.stringify({ url: addUrl.trim(), source: 'manual' }) });
      setAddUrl(''); setOpenAdd(false);
      toast('Ajouté à la file de téléchargement', 'success');
      nav('/queue');
    } catch (e) { toast(e.message, 'error'); }
  };

  return html`
    <div class="p-4 md:p-6 max-w-[1800px] mx-auto">
      <div class="flex items-center gap-2 mb-6 flex-wrap">
        <h1 class="text-xl font-bold mr-auto">${q ? `Résultats pour "${q}"` : 'Bibliothèque'}</h1>
        ${['recent','watched','popular'].map((k) => html`
          <button key=${k} onClick=${() => setSort(k)}
            class=${`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${sort === k ? 'bg-txt text-bg shadow-lg' : 'bg-bg2 text-mute hover:bg-bg3 hover:text-txt'}`}>
            ${{ recent: 'Récents', watched: 'Récemment vus', popular: 'Populaires' }[k]}
          </button>`)}
        <button onClick=${() => setOpenAdd(true)}
          class="ml-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand hover:bg-brand2 text-sm font-medium transition-all shadow-lg shadow-brand/20 hover:shadow-brand/30">
          <${Icon} d=${I.plus} size=${16}/> Ajouter
        </button>
      </div>
      ${err && html`<div class="text-red-400 mb-4 text-sm bg-red-400/10 rounded-xl p-3">${err}</div>`}
      ${videos == null ? html`<${LoadingGrid}/>`
        : videos.length === 0 ? html`
          <div class="text-mute mt-24 text-center">
            <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-bg2 flex items-center justify-center">
              <${Icon} d=${I.play} size=${40} class="text-mute/40"/>
            </div>
            <div class="text-lg font-medium">Aucune vidéo pour l'instant</div>
            <div class="text-sm mt-2 text-mute/60">Ajoute une URL, ou installe l'extension pour envoyer depuis YouTube.</div>
          </div>`
        : html`
          <div class="grid gap-x-4 gap-y-8"
               style=${{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            ${videos.map((v) => html`<${VideoCard} key=${v.id} v=${v}/>`) }
          </div>`}
      ${openAdd && html`
        <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick=${() => setOpenAdd(false)}>
          <div class="bg-bg2 border border-line/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick=${(e) => e.stopPropagation()}>
            <h2 class="text-lg font-semibold mb-4">Ajouter une vidéo</h2>
            <input autoFocus value=${addUrl} onChange=${(e) => setAddUrl(e.target.value)}
              onKeyDown=${(e) => e.key === 'Enter' && addOne()}
              placeholder="https://www.youtube.com/watch?v=…"
              class="w-full bg-bg3 border border-line/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand/50 transition-colors"/>
            <div class="flex justify-end gap-3 mt-4">
              <button class="px-4 py-2 rounded-xl hover:bg-bg3 transition-colors text-sm font-medium" onClick=${() => setOpenAdd(false)}>Annuler</button>
              <button class="px-5 py-2 rounded-xl bg-brand hover:bg-brand2 transition-colors text-sm font-medium shadow-lg shadow-brand/20" onClick=${addOne}>Télécharger</button>
            </div>
          </div>
        </div>`}
    </div>`;
}
