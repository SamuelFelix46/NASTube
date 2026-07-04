// --- helpers ---
const $ = (id) => document.getElementById(id);
const COLORS = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const uc = (id) => COLORS[(id||0)%COLORS.length];

async function storage(keys) { return new Promise(r => chrome.storage.local.get(keys, r)); }
async function setStorage(obj) { return new Promise(r => chrome.storage.local.set(obj, r)); }

const DEFAULT_BACKEND = 'http://localhost:8765';
async function cfg() { return storage(['autoScan','userToken','userInfo']); }

function avatarHTML(u, size=24) {
  const c = u.avatar || uc(u.id);
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:${size>30?14:11}px;flex-shrink:0">${u.username[0].toUpperCase()}</div>`;
}

function msg(text, ok=true) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:0;left:0;right:0;padding:8px;text-align:center;font-size:13px;font-weight:500;background:${ok?'#0a7d29':'#c00'};color:#fff;z-index:99;transition:transform .2s;transform:translateY(-100%)`;
  document.body.prepend(el);
  requestAnimationFrame(() => el.style.transform='translateY(0)');
  setTimeout(() => { el.style.transform='translateY(-100%)'; setTimeout(()=>el.remove(),300); }, 2000);
}

function baseUrl() { return DEFAULT_BACKEND; }

// --- user section ---
async function renderUsers(c) {
  const grid = $('userGrid');
  const loginForm = $('loginForm');
  if (c.userToken && c.userInfo) {
    $('userDisplay').innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
      ${avatarHTML(c.userInfo, 28)}
      <div style="flex:1;font-size:12px"><b>${c.userInfo.username}</b><br><span style="color:#888;font-size:11px">${c.userInfo.email}</span></div>
      <button id="logoutBtn" class="btn btn-danger btn-sm" style="padding:3px 8px">✕</button>
    </div>`;
    $('logoutBtn').onclick = async () => {
      const tok = c.userToken;
      if (tok) fetch(baseUrl()+'/api/auth/logout',{method:'POST',headers:{'X-User-Token':tok}}).catch(()=>{});
      await setStorage({userToken:'',userInfo:null});
      await loadAll();
    };
    grid.innerHTML = '';
    loginForm.style.display = 'none';
    return;
  }
  $('userDisplay').innerHTML = `<div style="text-align:center;padding:4px 0;font-size:12px;color:#888">Compte non connecté</div>`;
  const base = baseUrl();
  try {
    const r = await fetch(base+'/api/auth/users');
    if (!r.ok) throw Error();
    const users = await r.json();
    if (users.length) {
      grid.innerHTML = users.map(u => `<button class="user-chip" data-login="${u.username}" data-pwd="">
        ${avatarHTML(u, 20)}<span>${u.username}</span>
      </button>`).join('');
      grid.querySelectorAll('.user-chip').forEach(btn => {
        btn.onclick = () => {
          $('loginInput').value = btn.dataset.login;
          loginForm.style.display = 'block';
          $('pwdInput').focus();
        };
      });
    } else {
      grid.innerHTML = '<div style="font-size:11px;color:#666;text-align:center;padding:4px 0">Aucun compte</div>';
    }
  } catch {
    grid.innerHTML = '<div style="font-size:11px;color:#c66;text-align:center;padding:4px 0">Serveur injoignable</div>';
  }
  loginForm.style.display = 'block';
}

// --- login ---
$('loginBtn').onclick = async () => {
  const c = await cfg();
  const base = baseUrl();
  const login = $('loginInput').value.trim();
  const pwd = $('pwdInput').value;
  if (!login||!pwd) { $('loginStatus').textContent = 'Champs requis'; return; }
  $('loginStatus').textContent = 'Connexion…';
  try {
    const r = await fetch(base+'/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({login,password:pwd}),
    });
    if (!r.ok) { $('loginStatus').textContent = 'Identifiants invalides'; return; }
    const d = await r.json();
    await setStorage({userToken:d.token,userInfo:d.user});
    $('loginStatus').textContent = '✓ Connecté';
    $('pwdInput').value = '';
    await loadAll();
  } catch(e) { $('loginStatus').textContent = 'Erreur: '+e.message; }
};

$('cancelLoginBtn').onclick = () => { $('loginForm').style.display = 'none'; };

// --- actions ---
async function doAction(action, payload) {
  const c = await cfg();
  if (!c.userToken) { msg('Connecte d\'abord un compte', false); return; }
  return new Promise(res => {
    chrome.runtime.sendMessage({action, payload}, res);
  });
}

$('dlBtn').onclick = async () => {
  if ($('dlBtn').disabled) return;
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  if (!tab.url?.includes('/watch')) { msg('Ouvre une page YouTube d\'abord', false); return; }
  const r = await doAction('enqueue', {url: tab.url, source:'manual'});
  msg(r?.ok ? 'Ajouté à la file ✓' : 'Erreur: '+(r?.error||'?'), !!r?.ok);
};

$('cookiesBtn').onclick = async () => {
  if ($('cookiesBtn').disabled) return;
  $('cookiesBtn').textContent = '🍪 Synchro…';
  $('cookiesBtn').disabled = true;
  const r = await doAction('syncCookies', {});
  if (r?.ok) msg('Cookies YouTube synchronisés ✓', true);
  else msg('Erreur cookies: '+(r?.error||'?'), false);
  $('cookiesBtn').textContent = '🍪 Sync cookies YouTube';
  $('cookiesBtn').disabled = false;
};

$('scanBtn').onclick = async () => {
  if ($('scanBtn').disabled) return;
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  const res = await chrome.scripting.executeScript({
    target:{tabId:tab.id},
    func: () => {
      const urls=new Set(), seen=new Set();
      document.querySelectorAll('a[href*="/watch?v="]').forEach(a => {
        const m=a.getAttribute('href').match(/[?&]v=([A-Za-z0-9_-]{11})/);
        if(m&&!seen.has(m[1])){seen.add(m[1]);urls.add(`https://www.youtube.com/watch?v=${m[1]}`);}
      });
      return [...urls];
    }
  });
  const urls = res?.[0]?.result||[];
  if (!urls.length) { msg('Aucune recommandation', false); return; }
  const r = await doAction('enqueueBulk', {urls, source:'reco'});
  msg(r?.ok ? `${r.queued} vidéo(s) envoyée(s)` : 'Erreur: '+(r?.error||'?'), !!r?.ok);
};

// --- stats ---
async function loadStats() {
  try {
    const c = await cfg();
  const base = baseUrl();
    const headers = {'X-API-Token': c.apiToken||''};
    if (c.userToken) headers['X-User-Token'] = c.userToken;
    const r = await fetch(base+'/api/stats', {headers});
    if (!r.ok) throw Error(await r.text());
    const s = await r.json();
    const pct = s.max_total_gb ? Math.min(100,(s.storage_used_gb/s.max_total_gb)*100) : 0;
    $('stats').innerHTML = `
      <div class="row"><span>Vidéos</span><b>${s.counts.done}</b></div>
      <div class="row"><span>File d'attente</span><b>${s.counts.queued+s.counts.downloading}</b></div>
      <div class="row"><span>Utilisé</span><b>${s.storage_used_gb.toFixed(1)} / ${s.max_total_gb} Go</b></div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="row" style="border:0"><span>Libre</span><b>${s.disk_free_gb.toFixed(1)} Go</b></div>
      <div style="margin-top:6px;text-align:center"><span class="tag tag-green">● Connecté</span></div>`;
    $('dlBtn').disabled = false;
    $('scanBtn').disabled = false;
    $('cookiesBtn').disabled = false;
  } catch(e) {
    $('stats').innerHTML = `<div style="text-align:center;padding:8px;font-size:12px;color:#c66">⛔ Serveur injoignable</div>`;
    $('dlBtn').disabled = true;
    $('scanBtn').disabled = true;
    $('cookiesBtn').disabled = true;
  }
}

// --- settings ---
$('settingsToggle').onclick = () => {
  const body = $('settingsBody');
  const arrow = $('settingsArrow');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  arrow.textContent = isOpen ? '▶' : '▼';
};

async function loadSettings() {
  const c = await cfg();
  $('autoScanCheck').checked = !!c.autoScan;
}
$('autoScanCheck').onchange = async () => {
  await setStorage({autoScan: $('autoScanCheck').checked});
};

// --- init ---
async function loadAll() {
  const c = await cfg();
  await renderUsers(c);
  await loadStats();
  $('dlBtn').disabled = !c.userToken;
  $('scanBtn').disabled = !c.userToken;
}

$('refreshBtn').onclick = loadAll;

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadAll();
});
