import React, { useEffect, useState } from 'react';
import { html, I, api, Icon } from '../lib/utils.js';
import { VideoCard, LoadingGrid } from '../lib/components.js';

export function FavoritesPage() {
  const [videos, setVideos] = useState(null);
  useEffect(() => { api('/api/videos?favorite=true&limit=500', { auth: false }).then(setVideos).catch(() => setVideos([])); }, []);
  return html`
    <div class="p-4 md:p-6 max-w-[1800px] mx-auto">
      <h1 class="text-xl font-bold mb-6">Favoris</h1>
      ${videos == null ? html`<${LoadingGrid}/>`
        : videos.length === 0 ? html`
          <div class="text-center py-16">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-bg2 flex items-center justify-center">
              <${Icon} d=${I.heart} size=${32} class="text-mute/30"/>
            </div>
            <div class="text-lg font-medium text-mute">Aucun favori</div>
            <div class="text-sm text-mute/60 mt-1">Ajoute des vidéos en favoris depuis la page de lecture.</div>
          </div>`
        : html`<div class="grid gap-x-4 gap-y-8" style=${{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            ${videos.map((v) => html`<${VideoCard} key=${v.id} v=${v}/>`)}
          </div>`}
    </div>`;
}
