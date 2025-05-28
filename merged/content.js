/* ------------------------------------------------------------------
   content.js ­– video-caption → sign-language overlay
   Injected by popup.js (manifest no longer auto-injects)
------------------------------------------------------------------- */

// prevent double-injection if popup executes the file twice
if (!window.__signTranslatorLoaded) {
  window.__signTranslatorLoaded = true;

  /* ──────────────────────────────  state  ───────────────────────────── */
  let observer     = null;   // MutationObserver watching captions
  let pollInterval = null;   // ID returned by setInterval()
  let overlay      = null;   // floating <div> for the sign image
  let active       = false;  // are we currently translating?

  /* ───────────── fallback word ⇒ image URL dictionary ──────────────── */
  const fallback = {
    "daily routines":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
    "hi":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/hello.svg",
    "mom":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
    "i'm enjoying":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/enjoy.svg",
    "life":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/nature.svg",
    "new zealand":
      "https://cdn.britannica.com/18/3018-050-9EB93A42/New-Zealand.jpg",
    "countryside":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
    "beautiful":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/beautiful.svg",
    "six":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
    "wake":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
    "o'clock":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
    "morning":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
    "go":
      "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/go.svg",
    "run":
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s"
  };

  /* ──────────────  tiny helper: make / update overlay  ─────────────── */
  function ensureOverlay() {
    if (!overlay) {
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
  }

  function showImage(src, altText) {
    ensureOverlay();
    overlay.innerHTML = '';
    const img = document.createElement('img');
    img.src  = src;
    img.alt  = altText;
    img.style.maxWidth  = '100%';
    img.style.maxHeight = '100%';
    overlay.appendChild(img);
  }

  /* ───────────── caption observer / polling logic ─────────────────── */
  function handleCaptions(mutationList) {
    for (const m of mutationList) {
      const node = [...m.addedNodes]
        .find(n => n.nodeType === 1 && n.innerText?.trim());
      if (node) {
        // forward text to background for remote lookup
        chrome.runtime.sendMessage({
          type: 'newCaption',
          text: node.innerText
        });
        break;  // one caption line per mutation is enough
      }
    }
  }

  function startCaptionObserver() {
    if (observer) return;           // already running
    active = true;

    const tryAttach = () => {
      const tgt = document.querySelector(
        '.caption-window.ytp-caption-window-rollup'
      );
      if (tgt) {
        observer = new MutationObserver(handleCaptions);
        observer.observe(tgt, { childList: true, subtree: true });
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('[SignExt] observer attached');
      }
    };

    tryAttach();                          // immediate attempt
    pollInterval = setInterval(tryAttach, 1000); // retry until captions exist
    console.log('[SignExt] starting observer…');
  }

  function stopCaptionObserver() {
    active = false;
    observer?.disconnect();
    observer = null;
    clearInterval(pollInterval);
    pollInterval = null;
    overlay?.remove();
    overlay = null;
    console.log('[SignExt] observer stopped');
  }

  /* ─────────────── message router from popup / background ─────────── */
  chrome.runtime.onMessage.addListener((req) => {
    // toggle from popup
    if (req.type === 'toggleTranslation') {
      req.action === 'start' ? startCaptionObserver()
                             : stopCaptionObserver();
      return;
    }

    // sign array coming back from background
    if (req.type === 'displaySign' && active) {
      // choose first fetched image OR fallback dictionary
      const sign = req.signs.find(s => s.imageUrl) || {};
      const src  = sign.imageUrl || fallback[sign.word];
      if (src) showImage(src, sign.word || 'sign');
    }
  });
}
