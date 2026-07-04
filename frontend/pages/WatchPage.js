import React, { useEffect, useState, useCallback } from 'react';
import { html, I, api, nav, thumbUrl, channelAvatarUrl, fmtSize, fmtDuration, fmtDate, Icon } from '../lib/utils.js';
import { VideoCard, VideoPlayer, LoadingGrid, ChannelAvatar } from '../lib/components.js';

export function WatchPage({ id, toast }) {
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [err, setErr] = useState('');
  const [descOpen, setDescOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const v = await api(`/api/videos/${id}`, { auth: false });
      setVideo(v);
      const list = await api('/api/videos?status=done&limit=40', { auth: false });
      const sameChannel = list.filter((x) => x.id !== v.id && x.channel === v.channel);
      const others = list.filter((x) => x.id !== v.id && x.channel !== v.channel);
      setRelated([...sameChannel, ...others].slice(0, 16));
    } catch (e) { setErr(String(e)); }
  }, [id]);

  useEffect(() => { load(); window.scrollTo(0, 0); }, [load]);

  const toggleFav = async () => {
    try {
      const r = await api(`/api/videos/${video.id}/favorite`, { method: 'POST', body: JSON.stringify({ value: !video.is_favorite }) });
      setVideo({ ...video, is_favorite: r.is_favorite });
      toast(r.is_favorite ? 'Ajouté aux favoris' : 'Retiré des favoris', r.is_favorite ? 'success' : 'info');
    } catch (e) { toast(e.message, 'error'); }
  };
  const del = async () => {
    if (!confirm('Supprimer cette vidéo du NAS ?')) return;
    try { await api(`/api/videos/${video.id}`, { method: 'DELETE' }); toast('Vidéo supprimée', 'success'); nav('/'); }
    catch (e) { toast(e.message, 'error'); }
  };
  const share = () => {
    navigator.clipboard.writeText(video.url).then(() => toast('URL YouTube copiée', 'success'));
  };

  if (err) return html`<div class="p-6 text-red-400">${err}</div>`;
  if (!video) return html`<div class="p-6"><${LoadingGrid}/></div>`;

  const canPlay = video.status === 'done' && video.filename;
  const resumeAt = (video.last_position && video.last_position < (video.duration || 0) - 5) ? video.last_position : 0;

  return html`
    <div class="max-w-[1800px] mx-auto p-3 md:p-5 lg:p-6">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div class="min-w-0 space-y-4">
          ${canPlay
            ? html`<${VideoPlayer}
                src=${`/media/${encodeURIComponent(video.filename)}`}
                poster=${thumbUrl(video)}
                startAt=${resumeAt}
                videoDbId=${video.id}
                durationHint=${video.duration || 0} />`
            : html`<div class="aspect-video rounded-xl bg-bg2 border border-line/30 flex flex-col items-center justify-center gap-3">
                <div class="w-16 h-16 rounded-full bg-bg3 flex items-center justify-center text-mute/40">
                  <${Icon} d=${I.play} size=${28}/>
                </div>
                <p class="text-sm text-mute uppercase tracking-wider font-medium">Statut : ${video.status}</p>
                ${video.error && html`<p class="text-red-400 text-sm max-w-md text-center px-4">${video.error}</p>`}
              </div>`}

          <div class="space-y-3">
            <h1 class="text-lg md:text-xl font-bold leading-snug">${video.title || 'Sans titre'}</h1>

            <div class="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-line/25">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <${ChannelAvatar} url=${channelAvatarUrl(video)} name=${video.channel} size=${40}/>
                <div class="min-w-0">
                  <a href=${video.channel_url || '#'} target="_blank" rel="noreferrer"
                    class="font-medium text-sm hover:text-brand transition-colors truncate block">${video.channel || 'Chaîne inconnue'}</a>
                  <p class="text-xs text-mute/55 mt-0.5">${(video.watch_count || 0).toLocaleString()} vues · ${fmtDate(video.downloaded_at)}</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5 shrink-0">
                <button onClick=${toggleFav} title="Favori"
                  class=${`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all
                    ${video.is_favorite ? 'bg-brand/15 text-brand border-brand/30' : 'border-transparent text-mute hover:text-txt hover:bg-bg3/80'}`}>
                  <${Icon} d=${I.heart} size=${16} fill=${video.is_favorite ? 'currentColor' : 'none'}/>
                  <span class="hidden md:inline">${video.is_favorite ? 'Favori' : 'Favoris'}</span>
                </button>
                <button onClick=${share} title="Copier l'URL"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-mute hover:text-txt hover:bg-bg3/80 transition-all">
                  <${Icon} d=${I.share} size=${16}/><span class="hidden md:inline">Partager</span>
                </button>
                <a href=${video.url} target="_blank" rel="noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-mute hover:text-txt hover:bg-bg3/80 transition-all">
                  <${Icon} d=${I.ytube} size=${16}/><span class="hidden md:inline">YouTube</span>
                </a>
                ${canPlay && html`
                  <a href=${`/media/${encodeURIComponent(video.filename)}`} download
                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-mute hover:text-txt hover:bg-bg3/80 transition-all">
                    <${Icon} d=${I.download} size=${16}/><span class="hidden md:inline">Télécharger</span>
                  </a>`}
                <button onClick=${del} title="Supprimer"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-mute hover:bg-red-500/10 hover:text-red-400 transition-all">
                  <${Icon} d=${I.trash} size=${16}/>
                </button>
              </div>
            </div>

            <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute/60">
              <span>${fmtSize(video.filesize)}</span>
              <span>${fmtDuration(video.duration)}</span>
              <span>Source : ${video.source}</span>
              ${resumeAt > 0 && html`<span class="text-brand/80">Reprise à ${fmtDuration(resumeAt)}</span>`}
            </div>

            ${video.description && html`
              <div class="bg-bg2/60 rounded-xl p-4 border border-line/20">
                <div class=${`text-sm leading-relaxed whitespace-pre-wrap text-mute/85 ${descOpen ? '' : 'line-clamp-3'}`}>${video.description}</div>
                ${video.description.length > 180 && html`
                  <button class="mt-2 text-xs font-semibold text-brand hover:text-brand2 transition-colors uppercase tracking-wide"
                    onClick=${() => setDescOpen(!descOpen)}>
                    ${descOpen ? 'Réduire' : 'Voir plus'}
                  </button>`}
              </div>`}
          </div>
        </div>

        <aside class="min-w-0 lg:sticky lg:top-[3.75rem] lg:self-start lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto">
          <h3 class="text-xs font-semibold text-mute/50 uppercase tracking-wider mb-3 px-0.5">À suivre</h3>
          ${related.length === 0
            ? html`<p class="text-sm text-mute/40 px-0.5">Aucune suggestion</p>`
            : html`<div class="flex flex-col gap-2.5">
              ${related.map((v) => html`<${VideoCard} key=${v.id} v=${v} compact=${true}/>`)}
            </div>`}
        </aside>
      </div>
    </div>`;
}
