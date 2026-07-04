import React from 'react';
import htm from 'https://esm.sh/htm@3.1.1?dev';
export const html = htm.bind(React.createElement);

export const TOKEN_KEY = 'nastube_token';
export const THEME_KEY = 'nastube_theme';
export const LANG_KEY = 'nastube_lang';

const L = {
  fr: {
    home: 'Accueil', queue: 'File', favorites: 'Favoris', stats: 'Statistiques', settings: 'Paramètres',
    search: 'Rechercher', searchPlaceholder: 'Rechercher…', addVideo: 'Ajouter une vidéo',
    download: 'Télécharger', downloading: 'Téléchargement', queued: 'En attente', error: 'Erreur', done: 'Terminé',
    login: 'Se connecter', register: 'Créer un compte', logout: 'Déconnexion', password: 'Mot de passe',
    email: 'Email', username: 'Pseudo', confirmPwd: 'Confirmer le mot de passe', wrongPwd: 'Mot de passe incorrect',
    chooseAccount: 'Choisis un compte ou crées-en un', noAccount: 'Aucun compte pour l\'instant',
    addAccount: 'Ajouter un compte', or: 'ou', cancel: 'Annuler', save: 'Enregistrer', saved: 'Enregistré',
    creating: 'Création…', connecting: 'Connexion…', allFieldsReq: 'Tous les champs sont requis',
    pwdMismatch: 'Les mots de passe ne correspondent pas', pwdMin: 'Minimum 4 caractères',
    noVideos: 'Aucune vidéo pour le moment', justNow: "à l'instant", minAgo: 'min', hourAgo: 'h', dayAgo: 'j',
    views: 'vues', unknownChannel: 'Chaîne inconnue', noTitle: 'Sans titre',
    videoAdded: 'Ajouté à la file', scanRecos: 'Scanner les recommandations',
    networkAccess: 'Accès réseau', copyUrl: "Copier l'URL", multiDevice: 'Accès multi-appareils',
    myAccount: 'Mon compte', apiToken: 'Jeton API', modifyToken: 'Modifier le jeton local',
    configureToken: 'Configurer le jeton local', downloadSettings: 'Téléchargements',
    quality: 'Qualité max', concurrent: 'Simultanés', keepDays: 'Jours de conservation',
    favoritesNeverDeleted: 'Les favoris ne sont jamais supprimés', cookiesBrowser: 'Cookies navigateur',
    language: 'Langue', theme: 'Thème', darkLabel: 'Sombre', darkBlueLabel: 'Bleu Nuit',
    darkGreenLabel: 'Forêt', lightLabel: 'Clair', connectedAs: 'Connecté en tant que',
    notConnected: 'Non connecté', backendUrl: 'URL du backend', apiTokenLabel: 'Jeton API',
    extensionLogin: 'Compte utilisateur', loadUsers: 'Charger les comptes',
    noUsers: 'Aucun compte trouvé. Crée-en un sur l\'interface web.',
    autoScan: 'Auto-scan des recommandations', testConn: 'Tester la connexion',
    connOk: 'Connexion réussie', connFail: 'Échec de connexion',
    invalidCreds: 'Email ou mot de passe incorrect', invalidToken: 'Jeton API invalide',
    serverOffline: 'Backend injoignable', refresh: 'Rafraîchir',
    confirmDelete: 'Supprimer cette vidéo ?', delete: 'Supprimer', openOnYT: 'Ouvrir sur YouTube',
    share: 'Partager', favorite: 'Favori', notFound: 'Introuvable',
  },
  en: {
    home: 'Home', queue: 'Queue', favorites: 'Favorites', stats: 'Statistics', settings: 'Settings',
    search: 'Search', searchPlaceholder: 'Search…', addVideo: 'Add a video',
    download: 'Download', downloading: 'Downloading', queued: 'Queued', error: 'Error', done: 'Done',
    login: 'Sign in', register: 'Create account', logout: 'Log out', password: 'Password',
    email: 'Email', username: 'Username', confirmPwd: 'Confirm password', wrongPwd: 'Wrong password',
    chooseAccount: 'Choose an account or create one', noAccount: 'No accounts yet',
    addAccount: 'Add an account', or: 'or', cancel: 'Cancel', save: 'Save', saved: 'Saved',
    creating: 'Creating…', connecting: 'Connecting…', allFieldsReq: 'All fields are required',
    pwdMismatch: 'Passwords do not match', pwdMin: 'Minimum 4 characters',
    noVideos: 'No videos yet', justNow: 'just now', minAgo: 'min ago', hourAgo: 'h ago', dayAgo: 'd ago',
    views: 'views', unknownChannel: 'Unknown channel', noTitle: 'Untitled',
    videoAdded: 'Added to queue', scanRecos: 'Scan recommendations',
    networkAccess: 'Network access', copyUrl: 'Copy URL', multiDevice: 'Multi-device access',
    myAccount: 'My account', apiToken: 'API Token', modifyToken: 'Modify local token',
    configureToken: 'Configure local token', downloadSettings: 'Downloads',
    quality: 'Max quality', concurrent: 'Concurrent downloads', keepDays: 'Retention (days)',
    favoritesNeverDeleted: 'Favorites are never deleted', cookiesBrowser: 'Browser cookies',
    language: 'Language', theme: 'Theme', darkLabel: 'Dark', darkBlueLabel: 'Dark Blue',
    darkGreenLabel: 'Forest', lightLabel: 'Light', connectedAs: 'Connected as',
    notConnected: 'Not connected', backendUrl: 'Backend URL', apiTokenLabel: 'API Token',
    extensionLogin: 'User account', loadUsers: 'Load accounts',
    noUsers: 'No accounts found. Create one on the web interface.',
    autoScan: 'Auto-scan recommendations', testConn: 'Test connection',
    connOk: 'Connection successful', connFail: 'Connection failed',
    invalidCreds: 'Invalid email or password', invalidToken: 'Invalid API token',
    serverOffline: 'Backend unreachable', refresh: 'Refresh',
    confirmDelete: 'Delete this video?', delete: 'Delete', openOnYT: 'Open on YouTube',
    share: 'Share', favorite: 'Favorite', notFound: 'Not found',
  },
};

export function t(key) { return (L[getLang()] || L.en)[key] || key; }

export const LANG_OPTIONS = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
];

export function getLang() { return localStorage.getItem(LANG_KEY) || navigator.language?.startsWith('fr') ? 'fr' : 'en'; }
export function setLang(id) { localStorage.setItem(LANG_KEY, id); location.reload(); }

export const THEMES = [
  { id: 'dark', label: 'Sombre', icon: 'M21.8 13.5a8.5 8.5 0 0 1-8.5-8.5A8.5 8.5 0 0 1 13.5.2a10 10 0 1 0 10.3 13.3z' },
  { id: 'dark-blue', label: 'Bleu Nuit', icon: 'M21.8 13.5a8.5 8.5 0 0 1-8.5-8.5A8.5 8.5 0 0 1 13.5.2a10 10 0 1 0 10.3 13.3z' },
  { id: 'dark-green', label: 'Forêt', icon: 'M21.8 13.5a8.5 8.5 0 0 1-8.5-8.5A8.5 8.5 0 0 1 13.5.2a10 10 0 1 0 10.3 13.3z' },
  { id: 'light', label: 'Clair', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.4-6.4l-.7.7M6.4 17.6l-.7.7m12.1 0l-.7-.7M6.4 6.4l-.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
];

export function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
export function setTheme(id) {
  localStorage.setItem(THEME_KEY, id);
  document.documentElement.dataset.theme = id;
  const meta = document.getElementById('meta-theme');
  const colors = { dark: '#0f0f0f', 'dark-blue': '#0a0e1a', 'dark-green': '#0a140e', light: '#ffffff' };
  if (meta) meta.content = colors[id] || '#0f0f0f';
}
document.documentElement.dataset.theme = getTheme();
const mt = document.getElementById('meta-theme');
if (mt) mt.content = { dark: '#0f0f0f', 'dark-blue': '#0a0e1a', 'dark-green': '#0a140e', light: '#ffffff' }[getTheme()] || '#0f0f0f';

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }

export const USER_TOKEN_KEY = 'nastube_user_token';
export const USER_KEY = 'nastube_user';
export function getUserToken() { return localStorage.getItem(USER_TOKEN_KEY) || ''; }
export function setUserToken(t) { localStorage.setItem(USER_TOKEN_KEY, t); }
export function clearUserToken() { localStorage.removeItem(USER_TOKEN_KEY); localStorage.removeItem(USER_KEY); }
export function getCurrentUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
export function setCurrentUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }

fetch('/init-token.json').then((r) => r.ok ? r.json() : null).then((d) => {
  if (d?.token && !getToken()) setToken(d.token);
}).catch(() => {});

export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.auth !== false) {
    if (!getToken()) throw new Error('401 Jeton API manquant — clique sur "Configurer le jeton" dans le menu');
    headers['X-API-Token'] = getToken();
  }
  const ut = getUserToken();
  if (ut) headers['X-User-Token'] = ut;
  const r = await fetch(path, { ...opts, headers });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    if (r.status === 401) throw new Error('401 Jeton API invalide — mets à jour ton jeton dans les paramètres');
    throw new Error(`${r.status} ${body}`);
  }
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : r.text();
}

export function userColor(id) {
  const colors = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];
  return colors[(id || 0) % colors.length];
}

export const fmtDuration = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`
           : `${m}:${String(x).padStart(2,'0')}`;
};

export const fmtSize = (b) => {
  if (!b) return '—';
  const u = ['B','KB','MB','GB','TB']; let i = 0; let v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
};

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000;
  const lang = getLang();
  if (lang === 'en') {
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)} h ago`;
    if (diff < 86400*30) return `${Math.floor(diff/86400)} d ago`;
    return d.toLocaleDateString('en');
  }
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)} h`;
  if (diff < 86400*30) return `il y a ${Math.floor(diff/86400)} j`;
  return d.toLocaleDateString('fr');
};

export const thumbUrl = (v) => v.thumbnail || (v.youtube_id ? `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg` : '');
export const channelAvatarUrl = (v) => {
  if (!v.channel_url) return null;
  const m = v.channel_url.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (m) return `https://yt3.ggpht.com/${m[1]}=s48-c-k-c0x00ffffff-no-nd-rj`;
  return null;
};

export function useHashRoute() {
  const [hash, setHash] = React.useState(window.location.hash || '#/');
  React.useEffect(() => {
    const h = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h);
  }, []);
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const params = new URLSearchParams(hash.split('?')[1] || '');
  return { hash, parts, route: parts[0] || 'home', id: parts[1], params };
}
export const nav = (to) => { window.location.hash = to; };

export function Icon({ d, size = 20, strokeWidth, fill = 'none', stroke = 'currentColor', className = '' }) {
  const sw = strokeWidth ?? (size <= 16 ? 1.5 : 1.75);
  const paths = Array.isArray(d) ? d : [{ d, fill, stroke }];
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none"
    class=${`shrink-0 block ${className}`}
    stroke=${stroke} strokeWidth=${sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    ${paths.map((p, i) => html`<path key=${i} d=${p.d} fill=${p.fill ?? fill} stroke=${p.stroke ?? stroke}/>`)}
  </svg>`;
}

export const I = {
  home: 'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z',
  queue: 'M4 6h16M4 12h10M4 18h7M15 15l3 3 3-3',
  fav: 'M12 20.5l-1.2-1.1C5.4 14.7 2 11.6 2 7.9 2 5 4.2 3 6.9 3c1.7 0 3.3.8 4.3 2.1C12.2 3.8 13.8 3 15.5 3 18.2 3 20.4 5 20.4 7.9c0 3.7-3.4 6.8-8.8 11.5L12 20.5z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-4.35-4.35',
  play: 'M8 5.5v13l10.5-6.5L8 5.5z',
  trash: 'M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M6 6l.8 13.5A1.5 1.5 0 0 0 8.3 21h7.4a1.5 1.5 0 0 0 1.5-1.5L18 6',
  reload: 'M21 2v5h-5M3 22v-5h5M18.4 6.6A9 9 0 0 0 5.6 5.6L3 10M20 14l-2.6 4.4A9 9 0 0 0 18.4 17.4',
  plus: 'M12 5v14M5 12h14',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13',
  stats: 'M3 3v18h18M7 16l3-4 3 2 5-7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  ytube: [{ d: 'M22.5 7.2a3 3 0 0 0-2.1-2.1C18 4.5 12 4.5 12 4.5s-6 0-8.4.6A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c2.4.6 8.4.6 8.4.6s6 0 8.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8z', fill: 'currentColor', stroke: 'none' }, { d: 'M10 15.5V8.5l6 3.5-6 3.5z', fill: 'var(--c-bg)', stroke: 'none' }],
  download: 'M12 3v10M7 8l5 5 5-5M5 21h14',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  wifi: 'M5 12.5a8 8 0 0 1 14 0M8.5 9.4a5 5 0 0 1 7 0M12 20h.01M2 8.5a12 12 0 0 1 20 0',
  qr: 'M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2zm12 0h2v2h-2v-2z',
  check: 'M20 6L9 17l-5-5',
  close: 'M18 6L6 18M6 6l12 12',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  pause: 'M7 5h4v14H7V5zm6 0h4v14h-4V5z',
  skipBack: 'M11 18l-6-6 6-6M17 18l-6-6 6-6',
  skipFwd: 'M7 6l6 6-6 6M13 6l6 6-6 6',
  volume: 'M11 5L6 9H2v6h4l5 4V5zM19.1 4.9a10 10 0 0 1 0 14.2M15.5 8.4a5 5 0 0 1 0 7.2',
  mute: 'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6',
  fullscreen: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  fullscreenExit: 'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 21v-2a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v2',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};
