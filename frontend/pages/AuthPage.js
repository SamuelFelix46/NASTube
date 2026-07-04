import React, { useEffect, useState } from 'react';
import { html, I, api, Icon, setUserToken, setCurrentUser, userColor } from '../lib/utils.js';

export function AuthPage({ onLogin }) {
  const [users, setUsers] = useState(null);
  const [mode, setMode] = useState('list');
  const [selected, setSelected] = useState(null);
  const [pwd, setPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [reg, setReg] = useState({ username: '', email: '', password: '', confirm: '' });
  const [regErr, setRegErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUsers = () => {
    api('/api/auth/users', { auth: false }).then(setUsers).catch(() => {});
  };
  useEffect(() => { loadUsers(); }, []);

  const doLogin = async () => {
    if (!pwd) return;
    setBusy(true); setPwdErr('');
    try {
      const r = await api('/api/auth/login', {
        method: 'POST', auth: false,
        body: JSON.stringify({ login: selected.username, password: pwd }),
      });
      setUserToken(r.token);
      setCurrentUser(r.user);
      onLogin(r.user);
    } catch (e) {
      setPwdErr('Mot de passe incorrect');
    }
    setBusy(false);
  };

  const doRegister = async () => {
    if (!reg.username || !reg.email || !reg.password) { setRegErr('Tous les champs sont requis'); return; }
    if (reg.password !== reg.confirm) { setRegErr('Les mots de passe ne correspondent pas'); return; }
    if (reg.password.length < 4) { setRegErr('Minimum 4 caractères'); return; }
    setBusy(true); setRegErr('');
    try {
      const r = await api('/api/auth/register', {
        method: 'POST', auth: false,
        body: JSON.stringify({ username: reg.username, email: reg.email, password: reg.password }),
      });
      setUserToken(r.token);
      setCurrentUser(r.user);
      onLogin(r.user);
    } catch (e) {
      setRegErr(e.message);
    }
    setBusy(false);
  };

  const avatar = (u, size = 48) => {
    const c = u.avatar || userColor(u.id);
    return html`<div style=${{ width: size, height: size, background: c }}
      class="rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg">${u.username[0].toUpperCase()}</div>`;
  };

  if (users === null) return html`<div class="min-h-screen flex items-center justify-center bg-bg"><div class="w-8 h-8 rounded-full border-2 border-white/20 border-t-brand vp-spinner"></div></div>`;

  return html`
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg via-bg2 to-bg p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand text-white shadow-2xl shadow-brand/30 mb-4">
            <${Icon} d=${I.play} size=${28} fill="white" stroke="none"/>
          </div>
          <h1 class="text-2xl font-bold">NAS<span class="text-brand">Tube</span></h1>
          <p class="text-sm text-mute/60 mt-1">Choisis un compte ou crées-en un</p>
        </div>

        ${mode === 'list' && html`
          <div class="bg-bg2 border border-line/30 rounded-2xl p-5 shadow-xl">
            ${users.length === 0 ? html`
              <div class="text-center py-6 text-mute/60 text-sm">Aucun compte pour l'instant</div>
            ` : html`
              <div class="flex flex-wrap gap-3 justify-center mb-4">
                ${users.map((u) => html`
                  <button key=${u.id} onClick=${() => { setSelected(u); setMode('login'); setPwd(''); setPwdErr(''); }}
                    class="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-bg3/80 transition-all group w-24">
                    ${avatar(u, 52)}
                    <span class="text-xs font-medium text-mute group-hover:text-txt truncate w-full text-center transition-colors">${u.username}</span>
                  </button>`)}
              </div>
            `}
            <button onClick=${() => { setMode('register'); setReg({ username: '', email: '', password: '', confirm: '' }); setRegErr(''); }}
              class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-line/50 text-mute hover:text-txt hover:border-brand/50 hover:bg-brand/5 transition-all text-sm font-medium">
              <${Icon} d=${I.plus} size=${18}/> Ajouter un compte
            </button>
          </div>
        `}

        ${mode === 'login' && selected && html`
          <div class="bg-bg2 border border-line/30 rounded-2xl p-5 shadow-xl animate-fade-in">
            <div class="flex flex-col items-center mb-5">
              ${avatar(selected, 64)}
              <span class="text-lg font-semibold mt-2">${selected.username}</span>
              <span class="text-xs text-mute/60">${selected.email || ''}</span>
            </div>
            <input type="password" value=${pwd} onChange=${(e) => setPwd(e.target.value)}
              onKeyDown=${(e) => e.key === 'Enter' && doLogin()}
              placeholder="Mot de passe"
              class="w-full bg-bg3 border border-line/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand/50 transition-colors mb-1" autoFocus />
            ${pwdErr && html`<p class="text-red-400 text-xs mt-1">${pwdErr}</p>`}
            <div class="flex gap-2 mt-4">
              <button onClick=${() => setMode('list')}
                class="flex-1 px-4 py-2.5 rounded-xl hover:bg-bg3 transition-colors text-sm font-medium">Annuler</button>
              <button onClick=${doLogin} disabled=${busy}
                class="flex-1 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand2 transition-all text-sm font-medium shadow-lg shadow-brand/20 disabled:opacity-50">${busy ? 'Connexion…' : 'Se connecter'}</button>
            </div>
          </div>
        `}

        ${mode === 'register' && html`
          <div class="bg-bg2 border border-line/30 rounded-2xl p-5 shadow-xl animate-fade-in">
            <h2 class="text-lg font-semibold mb-4 text-center">Créer un compte</h2>
            ${['username','email','password','confirm'].map((k) => html`
              <div key=${k} class="mb-3">
                <input type=${k === 'password' || k === 'confirm' ? 'password' : k === 'email' ? 'email' : 'text'} value=${reg[k]} onChange=${(e) => setReg({ ...reg, [k]: e.target.value })}
                  onKeyDown=${(e) => e.key === 'Enter' && k === 'confirm' && doRegister()}
                  placeholder=${{ username: 'Pseudo', email: 'Email', password: 'Mot de passe', confirm: 'Confirmer le mot de passe' }[k]}
                  class="w-full bg-bg3 border border-line/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand/50 transition-colors" />
              </div>`)}
            ${regErr && html`<p class="text-red-400 text-xs mb-2">${regErr}</p>`}
            <div class="flex gap-2 mt-2">
              <button onClick=${() => setMode('list')}
                class="flex-1 px-4 py-2.5 rounded-xl hover:bg-bg3 transition-colors text-sm font-medium">Annuler</button>
              <button onClick=${doRegister} disabled=${busy}
                class="flex-1 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand2 transition-all text-sm font-medium shadow-lg shadow-brand/20 disabled:opacity-50">${busy ? 'Création…' : 'Créer le compte'}</button>
            </div>
          </div>
        `}
      </div>
    </div>`;
}