/* ------------------------------------------------------------------
   content.js – observes YouTube captions, asks background for signs,
   displays the returned image in an overlay.
------------------------------------------------------------------- */

if (!window.__signTranslatorLoaded) {
  window.__signTranslatorLoaded = true;

  /* state */
  let observer = null, poll = null, overlay = null, active = false;

  /* overlay helpers */
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position:'fixed', bottom:'20px', right:'20px',
      width:'200px', height:'200px', background:'#fff',
      border:'1px solid #bbb', borderRadius:'8px',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:'9999', boxShadow:'0 2px 8px rgba(0,0,0,.25)'
    });
    document.body.appendChild(overlay);
  }
  function show(src, alt) {
    ensureOverlay();
    overlay.innerHTML = '';
    const img = document.createElement('img');
    img.src = src; img.alt = alt;
    img.style.maxWidth = '100%'; img.style.maxHeight = '100%';
    overlay.appendChild(img);
  }

  /* caption observer */
  function handle(list) {
    for (const m of list) {
      const node = [...m.addedNodes].find(n => n.nodeType === 1 && n.innerText?.trim());
      if (node) {
        // send; retry once if SW was idle
        chrome.runtime.sendMessage(
          { type:'newCaption', text: node.innerText },
          () => {
            if (chrome.runtime.lastError) {
              setTimeout(() =>
                chrome.runtime.sendMessage({ type:'newCaption', text: node.innerText })
              , 60);
            }
          });
        break;
      }
    }
  }

  function start() {
    if (observer) return;
    active = true;

    const attach = () => {
      const tgt =
        document.querySelector('.caption-window.ytp-caption-window-rollup') ||
        document.querySelector('.ytp-live-caption-window') ||          /* NEW */
        document.querySelector('.ytp-caption-segment');                 /* NEW */

      if (tgt) {
        observer = new MutationObserver(handle);
        observer.observe(tgt, { childList:true, subtree:true });
        clearInterval(poll);
      }
    };
    attach();
    poll = setInterval(attach, 1000);
  }

  function stop() {
    active = false;
    observer?.disconnect(); observer = null;
    clearInterval(poll); poll = null;
    overlay?.remove(); overlay = null;
  }

  /* message router */
  chrome.runtime.onMessage.addListener(req => {
    if (req.type === 'toggleTranslation') {
      req.action === 'start' ? start() : stop();
      return;
    }
    if (req.type === 'displaySign' && active) {
      const hit = req.signs.find(s => s.imageUrl);
      if (hit) show(hit.imageUrl, hit.word);
    }
  });
}
