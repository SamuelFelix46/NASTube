import React, { useEffect, useState, useRef, useCallback } from 'react';
import { html, I, api, useHashRoute, nav, getTheme, setTheme, getToken, setToken, fmtDuration, fmtDate, thumbUrl, channelAvatarUrl, Icon, THEMES, userColor } from './utils.js';

let toastId = 0;
export function Toast({ toasts }) {
  if (!toasts.length) return null;
  return html`<div class="fixed top-2 right-2 sm:top-4 sm:right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-[90vw] sm:max-w-sm">
    ${toasts.map((t) => html`<div key=${t.id}
      class="pointer-events-auto px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium animate-slide-in backdrop-blur-sm
             ${t.type === 'error' ? 'bg-red-600/90 text-white' : t.type === 'success' ? 'bg-green-600/90 text-white' : 'bg-bg3/90 text-txt border border-line'}">
      ${t.msg}
    </div>`)}
  </div>`;
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);
  return { toasts, setToasts, toast };
}

export function ChannelAvatar({ url, name, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const letter = (name || '?').slice(0, 1).toUpperCase();
  if (!url || failed) return html`
    <div style=${{ width: size, height: size }} class="shrink-0 rounded-full bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-brand/20">
      ${letter}
    </div>`;
  return html`<img src=${url} style=${{ width: size, height: size }}
    class="shrink-0 rounded-full shadow-md shadow-black/20 object-cover"
    onError=${() => setFailed(true)} />`;
}

const Skeleton = ({ className = '' }) => html`<div class="animate-shimmer rounded-lg bg-bg3 ${className}"></div>`;

export function LoadingGrid() {
  return html`<div class="video-grid gap-x-3 md:gap-x-4 gap-y-6 md:gap-y-8">
    ${Array.from({ length: 12 }).map((_, i) => html`<div key=${i}>
      <${Skeleton} className="aspect-video w-full rounded-xl"/>
      <div class="mt-2 flex gap-3">
        <${Skeleton} className="w-9 h-9 rounded-full shrink-0"/>
        <div class="flex-1 space-y-2">
          <${Skeleton} className="h-4 w-full"/>
          <${Skeleton} className="h-3 w-2/3"/>
        </div>
      </div>
    </div>`)}
  </div>`;
}

function NetworkModal({ open, onClose, network }) {
  if (!open) return null;
  const url = network?.urls?.[0] || window.location.origin;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  return html`
    <div class="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in" onClick=${onClose}>
      <div class="bg-bg2 border border-line/50 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl animate-scale-in sm:animate-scale-in mt-auto sm:mt-0" onClick=${(e) => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Accès multi-appareils</h2>
          <button onClick=${onClose} class="p-1 rounded-lg hover:bg-bg3 transition-colors"><${Icon} d=${I.close} size=${20}/></button>
        </div>
        <p class="text-sm text-mute/60 mb-4">Scanne le QR code ou saisis l'URL sur un autre appareil du réseau.</p>
        <div class="flex justify-center mb-4">
          <img src=${qrSrc} alt="QR Code" class="w-40 sm:w-48 rounded-xl bg-white p-2 shadow-xl" />
        </div>
        <div class="bg-bg3 rounded-xl p-3 text-center text-sm font-mono select-all break-all">${url}</div>
        ${network?.ips?.length > 0 && html`
          <div class="mt-4 text-xs text-mute/60 space-y-1">
            <div class="font-medium text-mute">Autres adresses sur le réseau :</div>
            ${network.ips.map((ip) => html`
              <div key=${ip} class="font-mono">http://${ip}:${network.port}</div>
            `)}
          </div>
        `}
        <div class="mt-4 flex gap-2">
          <button onClick=${() => { navigator.clipboard.writeText(url); onClose(); }}
            class="flex-1 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand2 transition-all text-sm font-medium shadow-lg shadow-brand/20 active:scale-95">
            Copier l'URL
          </button>
        </div>
      </div>
    </div>`;
}

export function VideoCard({ v, compact = false }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  if (compact) return html`
    <a href=${`#/watch/${v.id}`} onClick=${() => sessionStorage.setItem('nastube_autoplay', '1')} class="flex gap-2 group">
      <div class="relative shrink-0 w-28 sm:w-40 aspect-video rounded-lg overflow-hidden bg-bg3">
        ${thumbUrl(v) ? html`<img src=${thumbUrl(v)} loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300 ${imgLoaded ? '' : 'opacity-0'}"
          onLoad=${() => setImgLoaded(true)}/>`
          : html`<div class="w-full h-full flex items-center justify-center text-mute/50"><${Icon} d=${I.play} size=${24}/></div>`}
        ${v.duration ? html`<span class="absolute bottom-1 right-1 text-[10px] bg-black/80 px-1 rounded font-medium">${fmtDuration(v.duration)}</span>` : ''}
      </div>
      <div class="min-w-0">
        <div class="text-sm font-medium clamp2 leading-snug">${v.title || 'Sans titre'}</div>
        <div class="flex items-center gap-1.5 mt-1">
          <${ChannelAvatar} url=${channelAvatarUrl(v)} name=${v.channel} size=${16}/>
          <span class="text-xs text-mute truncate">${v.channel}</span>
        </div>
        <div class="text-[11px] text-mute/60">${v.watch_count ? `${v.watch_count.toLocaleString()} vues · ` : ''}${fmtDate(v.downloaded_at || v.created_at)}</div>
      </div>
    </a>`;
  return html`
    <a href=${`#/watch/${v.id}`} onClick=${() => sessionStorage.setItem('nastube_autoplay', '1')} class="group block">
      <div class="relative aspect-video rounded-xl overflow-hidden bg-bg3 shadow-lg shadow-black/20 group-hover:shadow-brand/10 transition-all duration-300">
        ${thumbUrl(v) ? html`<img src=${thumbUrl(v)} loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300 ${imgLoaded ? '' : 'opacity-0 scale-105 blur-sm'}"
          onLoad=${(e) => { e.target.classList.remove('opacity-0', 'scale-105', 'blur-sm'); setImgLoaded(true); }}/>`
          : html`<div class="w-full h-full flex items-center justify-center text-mute/50"><${Icon} d=${I.play} size=${48}/></div>`}
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
          <div class="w-11 h-11 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 backdrop-blur-sm">
            <${Icon} d=${I.play} size=${20} fill="white" stroke="none"/>
          </div>
        </div>
        ${v.duration ? html`<span class="absolute bottom-1.5 right-1.5 text-xs font-medium bg-black/85 px-1.5 py-0.5 rounded">${fmtDuration(v.duration)}</span>` : ''}
        ${v.is_favorite ? html`<span class="absolute top-2 left-2 text-brand drop-shadow-lg"><${Icon} d=${I.fav} size=${18} fill="currentColor"/></span>` : ''}
        ${v.status !== 'done' ? html`<span class="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded bg-black/80 backdrop-blur-sm">${v.status}</span>` : ''}
      </div>
      <div class="mt-2.5 flex gap-2.5">
        <${ChannelAvatar} url=${channelAvatarUrl(v)} name=${v.channel} size=${36}/>
        <div class="min-w-0 flex-1">
          <div class="font-medium clamp2 leading-snug text-sm group-hover:text-brand transition-colors">${v.title || 'Sans titre'}</div>
          <div class="text-xs text-mute truncate mt-0.5">${v.channel || 'Chaîne inconnue'}</div>
          <div class="text-[11px] text-mute/50 mt-0.5">${v.watch_count ? `${v.watch_count.toLocaleString()} vues · ` : ''}${fmtDate(v.downloaded_at || v.created_at)}</div>
        </div>
      </div>
    </a>`;
}

export function VideoPlayer({ src, poster, startAt = 0, videoDbId, durationHint = 0 }) {
  const videoRef = useRef(null);
  const rootRef = useRef(null);
  const barRef = useRef(null);
  const hideRef = useRef(null);
  const lastReport = useRef(0);
  const startedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [needsClick, setNeedsClick] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint || 0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(() => {
    const v = localStorage.getItem('nastube_volume');
    return v != null ? Math.min(1, Math.max(0, parseFloat(v))) : 1;
  });
  const [muted, setMuted] = useState(false);
  const [fs, setFs] = useState(false);
  const [idle, setIdle] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [hoverPct, setHoverPct] = useState(null);
  const [flash, setFlash] = useState('');

  const showUi = () => {
    setIdle(false);
    clearTimeout(hideRef.current);
    if (playing) hideRef.current = setTimeout(() => setIdle(true), 2800);
  };

  const tryPlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return false;
    try {
      await el.play();
      setPlaying(true);
      setNeedsClick(false);
      return true;
    } catch {
      setPlaying(false);
      setNeedsClick(true);
      return false;
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      await tryPlay();
    } else {
      el.pause();
    }
    showUi();
  }, [tryPlay]);

  const seekTo = (pct) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.max(0, Math.min(duration, pct * duration));
    setCurrent(el.currentTime);
  };

  const flashHint = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 400);
  };

  useEffect(() => {
    startedRef.current = false;
    setReady(false);
    setLoading(true);
    setPlaying(false);
    setNeedsClick(false);
    setCurrent(0);
    setDuration(durationHint || 0);
    setBufferedEnd(0);
  }, [src, durationHint]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onMeta = () => {
      setDuration(el.duration || durationHint || 0);
      if (startAt > 0 && startAt < (el.duration || 0) - 3) {
        el.currentTime = startAt;
        setCurrent(startAt);
      }
      setReady(true);
    };

    const onCanPlay = async () => {
      setLoading(false);
      if (startedRef.current) return;
      startedRef.current = true;
      el.volume = volume;
      el.muted = muted;
      sessionStorage.removeItem('nastube_autoplay');
      await tryPlay();
    };

    const onTime = () => {
      if (!seeking) setCurrent(el.currentTime);
      if (el.buffered.length) {
        setBufferedEnd(el.buffered.end(el.buffered.length - 1));
      }
      const now = Date.now();
      if (videoDbId && now - lastReport.current > 10000 && !el.paused) {
        lastReport.current = now;
        api(`/api/videos/${videoDbId}/watch`, {
          method: 'POST',
          body: JSON.stringify({ seconds: 10, position: Math.floor(el.currentTime) }),
        }).catch(() => {});
      }
    };

    const onPlay = () => { setPlaying(true); setNeedsClick(false); showUi(); };
    const onPause = () => { setPlaying(false); setIdle(false); clearTimeout(hideRef.current); };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onEnded = () => { setPlaying(false); setIdle(false); };

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('ended', onEnded);
    };
  }, [src, startAt, videoDbId, volume, muted, seeking, tryPlay, durationHint]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) { el.volume = volume; localStorage.setItem('nastube_volume', String(volume)); }
  }, [volume]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  useEffect(() => {
    rootRef.current?.focus();
  }, [src]);

  useEffect(() => () => clearTimeout(hideRef.current), []);

  const toggleFs = useCallback(() => {
    const r = rootRef.current;
    if (!r) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else r.requestFullscreen?.();
    showUi();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const el = videoRef.current;
      if (!el) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'KeyK': e.preventDefault(); togglePlay(); break;
        case 'KeyF': e.preventDefault(); toggleFs(); break;
        case 'KeyM': e.preventDefault(); setMuted((m) => !m); break;
        case 'KeyJ': e.preventDefault(); el.currentTime -= 10; flashHint('-10 s'); break;
        case 'KeyL': e.preventDefault(); el.currentTime += 10; flashHint('+10 s'); break;
        case 'ArrowLeft': e.preventDefault(); el.currentTime -= 5; break;
        case 'ArrowRight': e.preventDefault(); el.currentTime += 5; break;
        case 'ArrowUp': e.preventDefault(); setVolume((v) => Math.min(1, +(v + 0.05).toFixed(2))); break;
        case 'ArrowDown': e.preventDefault(); setVolume((v) => Math.max(0, +(v - 0.05).toFixed(2))); break;
      }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleFs]);

  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const onBarClick = (e) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
    showUi();
  };

  const onBarMove = (e) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    setHoverPct(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (bufferedEnd / duration) * 100 : 0;

  return html`
    <div ref=${rootRef} tabindex="0"
      class=${`vp-root relative aspect-video shadow-2xl shadow-black/60 ring-1 ring-white/5 outline-none ${idle && playing ? 'vp-idle' : ''}`}
      onMouseMove=${showUi} onMouseLeave=${() => playing && setIdle(true)}
      onDoubleClick=${toggleFs}>

      <video ref=${videoRef} src=${src} poster=${poster || ''} playsInline preload="auto"
        class="absolute inset-0 w-full h-full cursor-pointer"
        onClick=${togglePlay} />

      ${loading && html`
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div class="w-10 h-10 rounded-full border-2 border-white/20 border-t-brand vp-spinner"></div>
        </div>`}

      ${needsClick && !playing && html`
        <button onClick=${(e) => { e.stopPropagation(); tryPlay(); }}
          class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-20 cursor-pointer">
          <span class="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-brand flex items-center justify-center shadow-2xl shadow-brand/50 hover:scale-105 transition-transform">
            <${Icon} d=${I.play} size=${32} fill="white" stroke="none" />
          </span>
          <span class="absolute bottom-24 text-sm text-white/70 font-medium">Cliquer pour lire</span>
        </button>`}

      ${!playing && ready && !needsClick && !loading && current > 0.5 && html`
        <button onClick=${togglePlay}
          class="vp-center-play absolute inset-0 flex items-center justify-center bg-black/25 z-10 cursor-pointer border-0">
          <span class="w-14 h-14 rounded-full bg-black/65 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-black/80 transition-colors">
            <${Icon} d=${I.play} size=${26} fill="white" stroke="none" />
          </span>
        </button>`}

      ${flash && html`
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-black/75 text-white text-sm font-medium vp-flash pointer-events-none z-30">
          ${flash}
        </div>`}

      <div class="vp-controls absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 pb-2 px-3 md:px-4">
        <div ref=${barRef}
          class="relative h-1 group/bar cursor-pointer mb-3 rounded-full bg-white/15 hover:h-1.5 transition-all"
          onClick=${onBarClick} onMouseMove=${onBarMove} onMouseLeave=${() => setHoverPct(null)}>
          <div class="absolute inset-y-0 left-0 rounded-full bg-white/25" style=${{ width: `${bufPct}%` }}></div>
          <div class="absolute inset-y-0 left-0 rounded-full bg-brand" style=${{ width: `${pct}%` }}></div>
          <div class="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-brand shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
            style=${{ left: `calc(${pct}% - 7px)` }}></div>
          ${hoverPct != null && html`
            <div class="absolute -top-8 px-1.5 py-0.5 rounded bg-black/90 text-[11px] font-medium text-white tabular-nums pointer-events-none"
              style=${{ left: `${hoverPct * 100}%`, transform: 'translateX(-50%)' }}>
              ${fmtDuration(hoverPct * duration)}
            </div>`}
        </div>

        <div class="flex items-center gap-1 md:gap-2 text-white">
          <button onClick=${togglePlay} class="p-2 rounded-lg hover:bg-white/10 transition-colors" title=${playing ? 'Pause (K)' : 'Lecture (K)'}>
            <${Icon} d=${playing ? I.pause : I.play} size=${22} fill=${playing ? 'none' : 'currentColor'} stroke=${playing ? 'currentColor' : 'none'} />
          </button>
          <button onClick=${() => { videoRef.current.currentTime -= 10; flashHint('-10 s'); showUi(); }}
            class="p-2 rounded-lg hover:bg-white/10 transition-colors hidden sm:block" title="Reculer 10 s (J)">
            <${Icon} d=${I.skipBack} size=${18} />
          </button>
          <button onClick=${() => { videoRef.current.currentTime += 10; flashHint('+10 s'); showUi(); }}
            class="p-2 rounded-lg hover:bg-white/10 transition-colors hidden sm:block" title="Avancer 10 s (L)">
            <${Icon} d=${I.skipFwd} size=${18} />
          </button>

          <div class="flex items-center gap-1.5 group/vol">
            <button onClick=${() => setMuted((m) => !m)} class="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Muet (M)">
              <${Icon} d=${muted || volume === 0 ? I.mute : I.volume} size=${18} />
            </button>
            <input type="range" min="0" max="1" step="0.02" value=${muted ? 0 : volume}
              onInput=${(e) => { setVolume(parseFloat(e.target.value)); setMuted(parseFloat(e.target.value) === 0); }}
              class="vp-vol w-0 group-hover/vol:w-20 transition-all duration-200 h-1 accent-brand cursor-pointer hidden sm:block" />
          </div>

          <span class="text-[11px] tabular-nums text-white/85 ml-0.5 sm:ml-1 min-w-[4.5rem]">
            ${fmtDuration(current)}<span class="text-white/35"> / ${fmtDuration(duration)}</span>
          </span>

          <div class="flex-1"></div>

          <button onClick=${toggleFs} class="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Plein écran (F)">
            <${Icon} d=${fs ? I.fullscreenExit : I.fullscreen} size=${18} />
          </button>
        </div>
      </div>
    </div>`;
}

export function Layout({ children, toast: t, user, onLogout }) {
  const [openSidebar, setOpen] = useState(true);
  const { route, params } = useHashRoute();
  const [q, setQ] = useState(params.get('q') || '');
  const [network, setNetwork] = useState(null);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  useEffect(() => {
    const p = params.get('q') || '';
    if (p !== q) setQ(p);
  }, [params.get('q')]);
  useEffect(() => {
    api('/api/network', { auth: false }).then(setNetwork).catch(() => {});
  }, []);
  const submit = (e) => { e.preventDefault(); nav(`/?q=${encodeURIComponent(q)}`); };
  const items = [
    { k: 'home', to: '/', label: 'Accueil', d: I.home },
    { k: 'queue', to: '/queue', label: 'File', d: I.queue },
    { k: 'favorites', to: '/favorites', label: 'Favoris', d: I.fav },
    { k: 'stats', to: '/stats', label: 'Statistiques', d: I.stats },
    { k: 'settings', to: '/settings', label: 'Paramètres', d: I.gear },
  ];
  const userAvatar = (u, size = 32) => {
    const c = u.avatar || userColor(u.id);
    return html`<div style=${{ width: size, height: size, background: c }}
      class="rounded-full flex items-center justify-center text-white font-bold shrink-0 text-xs">${u.username[0].toUpperCase()}</div>`;
  };
  return html`
    <${NetworkModal} open=${showNetwork} onClose=${() => setShowNetwork(false)} network=${network}/>
    <div class="min-h-screen flex flex-col bg-bg">
      <header class="h-14 flex items-center gap-2 px-3 md:px-4 sticky top-0 z-30 bg-bg/95 backdrop-blur-xl border-b border-line/40">
        <button class="p-2 rounded-lg hover:bg-bg2 transition-colors text-mute hover:text-txt" onClick=${() => setOpen(!openSidebar)} title="Menu" aria-label="Menu">
          <${Icon} d=${I.menu} size=${20} />
        </button>
        <a href="#/" class="flex items-center gap-2 shrink-0 mr-1">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand text-white shadow-md shadow-brand/25">
            <${Icon} d=${I.play} size=${14} fill="white" stroke="none" />
          </span>
          <span class="font-bold text-base tracking-tight hidden sm:inline">NAS<span class="text-brand">Tube</span></span>
        </a>
        <form onSubmit=${submit} class="flex-1 max-w-xl mx-auto flex min-w-0">
          <div class="flex-1 relative min-w-0">
            <input value=${q} onChange=${(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              class="w-full bg-bg2/80 border border-line/50 rounded-l-lg px-3.5 py-2 text-sm focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/20 transition-all placeholder:text-mute/50 pr-8" />
            ${q ? html`<button type="button" onClick=${() => { setQ(''); nav('/'); }}
              class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bg3 transition-colors text-mute hover:text-txt">
              <${Icon} d=${I.close} size=${14}/>
            </button>` : ''}
          </div>
          <button type="submit" class="px-3.5 bg-bg3 border border-l-0 border-line/50 rounded-r-lg hover:bg-line/80 transition-colors text-mute hover:text-txt" aria-label="Rechercher">
            <${Icon} d=${I.search} size=${17} />
          </button>
        </form>
        <div class="relative">
          <button onClick=${() => setShowUserMenu(!showUserMenu)}
            class="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-bg2 transition-colors" title=${user?.username || 'Utilisateur'}>
            ${user ? userAvatar(user, 28) : html`<span class="w-7 h-7 rounded-full bg-bg3 flex items-center justify-center text-mute"><${Icon} d=${I.user} size=${16}/></span>`}
          </button>
          ${showUserMenu && html`
            <div class="absolute right-0 top-full mt-1 w-48 bg-bg2 border border-line/30 rounded-xl shadow-2xl py-2 z-50 animate-fade-in" onClick=${() => setShowUserMenu(false)}>
              <div class="px-4 py-2 text-sm font-medium truncate border-b border-line/20">${user?.username || 'Utilisateur'}</div>
              <button onClick=${() => { setShowUserMenu(false); onLogout(); }}
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
                <${Icon} d=${I.logout} size=${16}/> Déconnexion
              </button>
            </div>
          `}
        </div>
      </header>
      <div class="flex-1 flex min-h-0">
        <aside class=${`${openSidebar ? 'w-52' : 'w-14'} shrink-0 border-r border-line/30 bg-bg2/50 overflow-y-auto transition-[width] duration-200 ease-out`}>
          <nav class="py-3 space-y-0.5">
            ${items.map((it) => html`
              <a key=${it.k} href=${`#${it.to}`}
                 class=${`flex items-center ${openSidebar ? 'gap-2.5 mx-2 px-3' : 'justify-center mx-1.5 px-0'} py-2 rounded-lg transition-all text-sm ${route === it.k
                   ? 'bg-brand/12 text-brand font-medium'
                   : 'text-mute hover:bg-bg3/80 hover:text-txt'}`}>
                <${Icon} d=${it.d} size=${18} />
                ${openSidebar && html`<span>${it.label}</span>`}
              </a>
            `)}
          </nav>
          ${openSidebar && html`
            <div class="px-3 py-3 mt-2 text-xs border-t border-line/25 space-y-1">
              <button onClick=${() => setShowNetwork(true)}
                class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-bg3/80 transition-colors text-left text-mute hover:text-txt">
                <${Icon} d=${I.qr} size=${14}/>
                <span class="flex-1 font-medium">Accès réseau</span>
                ${network?.ips?.length > 0 && html`<span class="bg-brand/15 text-brand text-[10px] font-semibold px-1.5 py-0.5 rounded">${network.ips.length}</span>`}
              </button>
              <div class="px-2 py-1 flex items-center gap-2 text-mute/50 truncate">
                <${Icon} d=${I.wifi} size=${11}/>
                <span class="truncate text-[11px]">${window.location.host}</span>
              </div>
              <div class="space-y-0.5 px-1 pt-2 border-t border-line/20">
                <div class="text-[10px] text-mute/50 mb-1.5 px-1">Thème</div>
                ${THEMES.map((th) => {
                  const active = getTheme() === th.id;
                  return html`
                    <button key=${th.id} onClick=${() => setTheme(th.id)}
                      class="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg transition-all text-left ${active ? 'bg-brand/15 text-brand font-medium' : 'text-mute hover:text-txt hover:bg-bg3/80'}">
                      <span class="w-3.5 h-3.5 rounded-full border" style=${{ borderColor: active ? 'var(--c-brand)' : 'var(--c-line)', background: { dark: '#0f0f0f', 'dark-blue': '#0a0e1a', 'dark-green': '#0a140e', light: '#ffffff' }[th.id] }}></span>
                      <span class="text-xs">${th.label}</span>
                      ${active ? html`<span class="ml-auto text-brand"><${Icon} d=${I.check} size=${12}/></span>` : ''}
                    </button>`;
                })}
              </div>
              ${user && html`
                <button onClick=${onLogout}
                  class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-left text-mute">
                  <${Icon} d=${I.logout} size=${14}/>
                  <span>Déconnexion</span>
                </button>`}
            </div>
          `}
        </aside>
        <main class="flex-1 min-w-0 bg-bg">${children}</main>
      </div>
    </div>`;
}
