(() => {
  const log = (...a) => console.debug('[NASTube]', ...a);

  let toastTimer = null;
  function toast(msg, isGood = true, ms = 3000) {
    const existing = document.querySelector('.nastube-toast');
    if (existing) existing.remove();
    if (toastTimer) clearTimeout(toastTimer);
    const el = document.createElement('div');
    el.className = 'nastube-toast' + (isGood ? '' : ' nastube-toast-err');
    el.textContent = msg;
    if (!isGood) el.style.background = '#c00';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  async function send(action, payload) {
    return new Promise((res) => chrome.runtime.sendMessage({ action, payload }, res));
  }

  function currentWatchUrl() {
    if (location.pathname !== '/watch') return null;
    const id = new URLSearchParams(location.search).get('v');
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  }

  function getMenuContainer() {
    return document.querySelector('#top-level-buttons-computed') ||
           document.querySelector('ytd-menu-renderer #top-level-buttons-computed') ||
           document.querySelector('#actions ytd-menu-renderer #top-level-buttons-computed');
  }

  function injectButton() {
    const url = currentWatchUrl();
    if (!url) return;
    const menu = getMenuContainer();
    if (!menu || menu.querySelector('.nastube-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'nastube-btn';
    btn.textContent = '⬇ NAS';
    btn.title = 'Télécharger sur NASTube';
    btn.onclick = async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      btn.textContent = '…';
      btn.classList.add('sending');
      const r = await send('enqueue', { url, source: 'manual' });
      btn.classList.remove('sending');
      btn.classList.add(r?.ok ? 'ok' : 'err');
      btn.textContent = r?.ok ? '✓ envoyé' : '✗ erreur';
      toast(r?.ok ? 'Ajouté à la file NASTube' : 'Erreur: ' + (r?.error || 'voir options'), !!r?.ok);
      setTimeout(() => {
        btn.classList.remove('ok', 'err');
        btn.textContent = '⬇ NAS';
        btn.disabled = false;
      }, 1500);
    };
    menu.prepend(btn);
  }

  function removeButton() {
    const btn = document.querySelector('.nastube-btn');
    if (btn) btn.remove();
  }

  function collectRecoUrls() {
    const urls = new Set();
    const seen = new Set();
    document.querySelectorAll('a#thumbnail[href*="/watch?v="], a.yt-simple-endpoint[href*="/watch?v="], ytd-rich-item-renderer a[href*="/watch?v="]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      const m = href.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        urls.add(`https://www.youtube.com/watch?v=${m[1]}`);
      }
    });
    document.querySelectorAll('a[href^="/shorts/"]').forEach((a) => {
      const m = a.getAttribute('href').match(/\/shorts\/([A-Za-z0-9_-]{11})/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        urls.add(`https://www.youtube.com/shorts/${m[1]}`);
      }
    });
    return [...urls];
  }

  let scanInterval = null;
  async function scan() {
    const cfg = await new Promise((r) => chrome.storage.local.get(['autoScan'], r));
    if (!cfg.autoScan) return;
    if (document.hidden) return;
    const urls = collectRecoUrls();
    if (!urls.length) return;
    log('scan', urls.length);
    const r = await send('enqueueBulk', { urls, source: 'reco' });
    if (r?.queued) toast(`${r.queued} vidéo(s) ajoutée(s) depuis les recommandations`);
  }

  function setupScan() {
    if (scanInterval) clearInterval(scanInterval);
    scanInterval = setInterval(scan, 60000);
    setTimeout(scan, 4000);
  }

  function onNavigate() {
    removeButton();
    setTimeout(injectButton, 300);
  }

  document.addEventListener('yt-navigate-finish', onNavigate);
  new MutationObserver(() => {
    if (currentWatchUrl() && !document.querySelector('.nastube-btn')) {
      injectButton();
    }
  }).observe(document.documentElement, { subtree: true, childList: true });

  setInterval(() => {
    if (currentWatchUrl() && !document.querySelector('.nastube-btn')) {
      injectButton();
    }
  }, 2000);

  if (currentWatchUrl()) injectButton();
  setupScan();
})();
