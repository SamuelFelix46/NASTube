import React, { useEffect, useState } from 'react';
import { html, I, api, fmtDuration, Icon } from '../lib/utils.js';
import { LoadingGrid } from '../lib/components.js';

export function StatsPage({ toast }) {
  const [s, setS] = useState(null);
  const [net, setNet] = useState(null);
  const load = async () => { try { setS(await api('/api/stats', { auth: false })); } catch {} };
  const loadNet = async () => { try { setNet(await api('/api/network', { auth: false })); } catch {} };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  useEffect(() => { loadNet(); }, []);
  const clean = async () => {
    try { const r = await api('/api/cleanup', { method: 'POST' }); toast(`Nettoyage : ${r.removed} vidéos, ${r.freed_gb} Go libérés`, 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };
  if (!s) return html`<div class="p-6"><${LoadingGrid}/></div>`;
  const used = s.storage_used_gb, cap = s.max_total_gb, pct = Math.min(100, (used / cap) * 100);
  const qrSrc = net?.urls?.[0] ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(net.urls[0])}` : null;
  return html`
    <div class="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 class="text-xl font-bold mb-6">Statistiques</h1>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-line/30">
          <div class="text-sm text-mute/60 mb-2 font-medium">Espace utilisé</div>
          <div class="text-3xl font-bold">${used.toFixed(1)} <span class="text-lg text-mute">/ ${cap} Go</span></div>
          <div class="w-full bg-bg3/50 rounded-full h-2.5 mt-4 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-brand to-orange-400 transition-all duration-500" style=${{ width: `${pct}%` }}></div>
          </div>
          <div class="flex justify-between text-xs text-mute/60 mt-2">
            <span>${s.disk_free_gb.toFixed(1)} Go libres</span>
            <span>min ${s.min_free_gb} Go réservés</span>
          </div>
        </div>
        <div class="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-line/30">
          <div class="text-sm text-mute/60 mb-3 font-medium">Bibliothèque</div>
          <div class="grid grid-cols-2 gap-3">
            ${[['done','Téléchargées', '#22c55e'], ['queued','En attente', '#eab308'], ['downloading','En cours', '#3b82f6'], ['errored','Erreurs', '#ef4444'], ['favorites','Favoris', '#ec4899']].map(([k,l,color]) => html`
              <div key=${k} class="bg-bg3/50 rounded-xl p-3 border border-line/20">
                <div class="text-2xl font-bold" style=${{ color }}>${s.counts[k] ?? 0}</div>
                <div class="text-xs text-mute/60">${l}</div>
              </div>`)}
          </div>
        </div>
        <div class="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-line/30">
          <div class="text-sm text-mute/60 mb-2 font-medium">Accès réseau</div>
          ${net ? html`
            <div class="flex items-center gap-4">
              ${qrSrc && html`<img src=${qrSrc} alt="QR" class="w-20 h-20 rounded-xl bg-white p-1.5 shrink-0 shadow-lg" />`}
              <div class="min-w-0 flex-1">
                <div class="text-xs text-mute/60 mb-1">Scanner pour accéder depuis un autre appareil</div>
                <div class="bg-bg3 rounded-lg px-2.5 py-2 text-sm font-mono select-all break-all">${net.urls[0]}</div>
                ${net.ips.length > 0 && html`
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${net.ips.map((ip) => html`
                      <span key=${ip} class="text-xs font-mono bg-bg3/50 rounded px-1.5 py-0.5">${ip}:${net.port}</span>
                    `)}
                  </div>`}
              </div>
            </div>
          ` : html`<div class="text-sm text-mute/40">Chargement…</div>`}
        </div>
        <div class="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-line/30">
          <div class="text-sm text-mute/60 mb-1 font-medium">Temps de visionnage total</div>
          <div class="text-2xl font-bold">${fmtDuration(s.watch_seconds_total)}</div>
          <div class="text-xs text-mute/40 mt-2 break-all">Stockage : ${s.storage_dir}</div>
          <button onClick=${clean}
            class="mt-4 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand2 transition-all text-sm font-medium shadow-lg shadow-brand/20">
            Lancer un nettoyage
          </button>
        </div>
      </div>
    </div>`;
}
