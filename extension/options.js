const fields = ['backendUrl', 'apiToken', 'autoScan', 'userToken', 'userInfo'];
chrome.storage.local.get(fields, (c) => {
  document.getElementById('backendUrl').value = c.backendUrl || 'http://localhost:8765';
  document.getElementById('apiToken').value = c.apiToken || '';
  document.getElementById('autoScan').checked = !!c.autoScan;
  updateUserUI(c.userToken, c.userInfo);
});

function updateUserUI(token, info) {
  const loginBtn = document.getElementById('userLoginBtn');
  const logoutBtn = document.getElementById('userLogoutBtn');
  const statusEl = document.getElementById('userStatus');
  if (token && info) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    statusEl.style.display = 'block';
    statusEl.style.background = '#0a2a0a';
    statusEl.style.color = '#6c6';
    statusEl.innerHTML = `Connecté en tant que <b>${info.username}</b> (${info.email})`;
  } else {
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    statusEl.style.display = 'none';
  }
}

function apiBase() {
  return document.getElementById('backendUrl').value.trim().replace(/\/+$/, '');
}

const statusEl = document.getElementById('status');
function setStatus(msg, ok) {
  statusEl.innerHTML = `<small style="color:${ok ? '#6c6' : '#c66'}">${msg}</small>`;
  setTimeout(() => { if (statusEl.textContent.includes(msg)) statusEl.innerHTML = '<small>&nbsp;</small>'; }, 3000);
}

document.getElementById('save').onclick = () => {
  const data = {
    backendUrl: document.getElementById('backendUrl').value.trim().replace(/\/+$/, ''),
    apiToken: document.getElementById('apiToken').value.trim(),
    autoScan: document.getElementById('autoScan').checked,
  };
  if (!data.backendUrl) { setStatus('L\'URL du backend est requise', false); return; }
  if (!/^https?:\/\/./.test(data.backendUrl)) { setStatus('URL invalide (doit commencer par http:// ou https://)', false); return; }
  chrome.storage.local.set(data, () => {
    setStatus('Sauvegardé ✓', true);
  });
};

const userColors = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];
function userColor(id) { return userColors[(id || 0) % userColors.length]; }

document.getElementById('loadUsersBtn').onclick = async () => {
  const base = apiBase();
  if (!base) { setStatus('Configure d\'abord l\'URL du backend', false); return; }
  try {
    const r = await fetch(base + '/api/auth/users');
    if (!r.ok) throw new Error(await r.text());
    const users = await r.json();
    const el = document.getElementById('userList');
    if (!users.length) {
      el.innerHTML = '<small style="color:#888">Aucun compte trouvé. Crée-en un sur l\'interface web.</small>';
      return;
    }
    el.innerHTML = users.map(u => {
      const c = u.avatar || userColor(u.id);
      return `<button class="user-btn" data-login="${u.username}" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;border-radius:8px;border:1px solid #333;background:#1a1a1a;cursor:pointer;transition:background .15s;min-width:60px" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#1a1a1a'">
        <div style="width:28px;height:28px;border-radius:50%;background:${c};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px">${u.username[0].toUpperCase()}</div>
        <span style="font-size:10px;color:#aaa;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.username}</span>
      </button>`;
    }).join('');
    el.querySelectorAll('.user-btn').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('userLogin').value = btn.dataset.login;
        document.getElementById('userPassword').focus();
      };
    });
    setStatus(`${users.length} compte(s) trouvé(s) ✓`, true);
  } catch (e) {
    setStatus('Erreur: ' + e.message, false);
  }
};

document.getElementById('testConn').onclick = async () => {
  const base = apiBase();
  const token = document.getElementById('apiToken').value.trim();
  if (!base || !token) { setStatus('Configure d\'abord URL et jeton', false); return; }
  setStatus('Test en cours…', true);
  try {
    const r = await fetch(base + '/api/health');
    const d = await r.json();
    if (d.ok) setStatus('Connexion réussie ! ✓', true);
    else setStatus('Réponse inattendue du serveur', false);
  } catch (e) {
    setStatus('Échec de connexion: ' + e.message, false);
  }
};

document.getElementById('userLoginBtn').onclick = async () => {
  const login = document.getElementById('userLogin').value.trim();
  const password = document.getElementById('userPassword').value;
  if (!login || !password) { setStatus('Email et mot de passe requis', false); return; }
  const base = apiBase();
  setStatus('Connexion…', true);
  try {
    const r = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    if (!r.ok) { setStatus('Échec de connexion: identifiants invalides', false); return; }
    const d = await r.json();
    chrome.storage.local.set({ userToken: d.token, userInfo: d.user }, () => {
      updateUserUI(d.token, d.user);
      setStatus('Connecté ✓', true);
    });
  } catch (e) {
    setStatus('Erreur: ' + e.message, false);
  }
};

document.getElementById('userLogoutBtn').onclick = async () => {
  const c = await new Promise(r => chrome.storage.local.get(['userToken', 'backendUrl'], r));
  if (c.userToken) {
    fetch((c.backendUrl || 'http://localhost:8765').replace(/\/$/, '') + '/api/auth/logout', {
      method: 'POST', headers: { 'X-User-Token': c.userToken },
    }).catch(() => {});
  }
  chrome.storage.local.set({ userToken: '', userInfo: null }, () => {
    updateUserUI(null, null);
    setStatus('Déconnecté', true);
  });
};
