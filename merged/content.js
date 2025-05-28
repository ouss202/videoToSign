/* ------------------------------------------------------------------
   content.js – observes YouTube captions, asks background for signs,
   displays the returned image in an overlay.
------------------------------------------------------------------- */

if (!window.__signTranslatorLoaded) {
  window.__signTranslatorLoaded = true;

  /* ───────── state ───────── */
  let observer = null;
  let poll     = null;
  let overlay  = null;
  let active   = false;

  /* ───────── overlay helpers ───────── */
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position : 'fixed',
      bottom   : '20px',
      right    : '20px',
      width    : '200px',
      height   : '200px',
      background : '#fff',
      border   : '1px solid #bbb',
      borderRadius : '8px',
      display  : 'flex',
      alignItems : 'center',
      justifyContent : 'center',
      boxShadow : '0 2px 8px rgba(0,0,0,.25)',
      zIndex   : '9999'
    });
    document.body.appendChild(overlay);
  }

  function show(src, alt) {
    ensureOverlay();
    overlay.innerHTML = '';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.style.maxWidth  = '100%';
    img.style.maxHeight = '100%';
    overlay.appendChild(img);
  }

  /* ───────── caption observer ───────── */
  function retryIfAsleep(text) {
    if (chrome.runtime.lastError) {
      setTimeout(() =>
        chrome.runtime.sendMessage({ type:'newCaption', text })
      , 60);
    }
  }

  function handle(mutations) {
    for (const mut of mutations) {
      const node = [...mut.addedNodes]
        .find(n => n.nodeType === 1 && n.innerText?.trim());
      if (node) {
        chrome.runtime.sendMessage(
          { type:'newCaption', text: node.innerText },
          () => retryIfAsleep(node.innerText)
        );
        break;
      }
    }
  }

  function start() {
    if (observer) return;          // already running
    active = true;

    const attach = () => {
      const target =
        document.querySelector('.caption-window.ytp-caption-window-rollup') ||
        document.querySelector('.ytp-live-caption-window') ||
        document.querySelector('.ytp-caption-segment');

      if (target) {
        observer = new MutationObserver(handle);
        observer.observe(target, { childList:true, subtree:true });
        clearInterval(poll);       // stop polling once attached
        poll = null;
      }
    };

    attach();
    poll = setInterval(attach, 1000);
  }

  function stop() {
    active = false;
    observer?.disconnect();
    observer = null;
    clearInterval(poll);
    poll = null;
    overlay?.remove();
    overlay = null;
  }

  /* ───────── message router ───────── */
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'toggleTranslation') {
      msg.action === 'start' ? start() : stop();
      return;
    }
    if (msg.type === 'displaySign' && active) {
      const hit = msg.signs.find(s => s.imageUrl);
      if (hit) show(hit.imageUrl, hit.word);
    }
  });
}
