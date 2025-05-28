/* ------------------------------------------------------------------
   content.js – observes YouTube captions, asks background for signs,
   shows the returned image in a small overlay.
------------------------------------------------------------------- */

// guard against double injection
if (!window.__signTranslatorLoaded) {
  window.__signTranslatorLoaded = true;

  /* ───────── state ───────── */
  let observer     = null;
  let pollInterval = null;
  let overlay      = null;
  let active       = false;

  /* ───────── UI helpers ───────── */
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'sign-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      bottom:   '20px',
      right:    '20px',
      width:    '200px',
      height:   '200px',
      background: '#fff',
      border:   '1px solid #bbb',
      borderRadius: '8px',
      display:  'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex:   '9999',
      boxShadow: '0 2px 8px rgba(0,0,0,.25)'
    });
    document.body.appendChild(overlay);
  }

  function showImage(src, alt) {
    ensureOverlay();
    overlay.innerHTML = '';
    const img = document.createElement('img');
    img.src  = src;
    img.alt  = alt;
    img.style.maxWidth  = '100%';
    img.style.maxHeight = '100%';
    overlay.appendChild(img);
  }

  /* ───────── caption observer ───────── */
  function handleMutations(list) {
    for (const m of list) {
      const node = [...m.addedNodes]
        .find(n => n.nodeType === 1 && n.innerText?.trim());
      if (node) {
        chrome.runtime.sendMessage({ type: 'newCaption', text: node.innerText });
        break;
      }
    }
  }

  function startObserver() {
    if (observer) return;
    active = true;

    const tryAttach = () => {
      const tgt = document.querySelector('.caption-window.ytp-caption-window-rollup');
      if (tgt) {
        observer = new MutationObserver(handleMutations);
        observer.observe(tgt, { childList: true, subtree: true });
        clearInterval(pollInterval);
      }
    };

    tryAttach();
    pollInterval = setInterval(tryAttach, 1000);
  }

  function stopObserver() {
    active = false;
    observer?.disconnect();
    observer = null;
    clearInterval(pollInterval);
    pollInterval = null;
    overlay?.remove();
    overlay = null;
  }

  /* ───────── message router ───────── */
  chrome.runtime.onMessage.addListener(req => {
    if (req.type === 'toggleTranslation') {
      req.action === 'start' ? startObserver() : stopObserver();
      return;
    }
    if (req.type === 'displaySign' && active) {
      const hit = req.signs.find(s => s.imageUrl);
      if (hit) showImage(hit.imageUrl, hit.word);
    }
  });
}
