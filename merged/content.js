/* ------------------------------------------------------------------
   Debug content.js - Shows image loading status
------------------------------------------------------------------- */

// Prevent multiple injections
if (window.__signTranslatorLoaded) {
  console.log('Sign translator already loaded, skipping...');
} else {
  window.__signTranslatorLoaded = true;
  
  /* ───────── Persistent state ───────── */
  let observer = null;
  let poll = null;
  let overlay = null;
  let active = false;
  let reconnectInterval = null;
  let lastCaptionTime = 0;

  /* ───────── Service Worker Connection Management ───────── */
  function ensureConnection() {
    chrome.runtime.sendMessage(
      { type: 'extensionStatus' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log('Background script not responsive, will retry...');
          scheduleReconnect();
        } else {
          console.log('Background script responsive:', response);
          clearReconnectInterval();
        }
      }
    );
  }

  function scheduleReconnect() {
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        ensureConnection();
      }, 5000);
    }
  }

  function clearReconnectInterval() {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  }

  /* ───────── Auto-restart on page navigation ───────── */
  function handlePageChange() {
    let currentUrl = window.location.href;
    
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('Page navigation detected, restarting...');
        
        setTimeout(() => {
          if (active) {
            stop();
            setTimeout(start, 1000);
          }
        }, 2000);
      }
    });
    
    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* ───────── Overlay helpers with image loading debug ───────── */
  function ensureOverlay() {
    if (overlay && document.body.contains(overlay)) return;
    
    const existingOverlay = document.querySelector('#sign-translator-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    overlay = document.createElement('div');
    overlay.id = 'sign-translator-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '200px',
      height: '200px',
      background: '#fff',
      border: '2px solid #4285f4',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,.3)',
      zIndex: '999999',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#333'
    });
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 8px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      color: #666;
      line-height: 1;
    `;
    closeBtn.onclick = stop;
    overlay.appendChild(closeBtn);
    
    // Add status indicator
    const status = document.createElement('div');
    status.id = 'sign-status';
    status.textContent = 'Listening for captions...';
    status.style.cssText = `
      position: absolute;
      bottom: 5px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #666;
      text-align: center;
      max-width: 180px;
    `;
    overlay.appendChild(status);
    
    document.body.appendChild(overlay);
    console.log('Overlay created and attached');
  }
function clearError() {
  if (!overlay) return;
  const old = overlay.querySelector('.sign-error');
  if (old) old.remove();
}

  function show(src, alt) {
  ensureOverlay();

  // ─── reset previous content ───
  const imgPrev = overlay.querySelector('img');
  if (imgPrev) imgPrev.remove();
  clearError();                           // ✨ NEW

  const status = overlay.querySelector('#sign-status');
  status.textContent = `Loading: ${alt}…`;
  status.style.color = '#ff9800';

  const img = document.createElement('img');
  img.alt = alt;
  img.style.cssText = 'max-width:180px;max-height:180px;object-fit:contain';

  img.onload = () => {
    clearError();                         // ✨ remove any stale error
    status.textContent = `Showing: ${alt}`;
    status.style.color = '#34a853';
  };

  img.onerror = () => {
    clearError();                         // ✨ make sure only one appears

    const err = document.createElement('div');
    err.className = 'sign-error';
    err.style.cssText = `
      text-align:center;
      color:#ea4335;
      font-size:12px;
      padding:10px;
    `;
    err.innerHTML = `❌ Image failed<br><small>${alt}</small>`;
    overlay.insertBefore(err, status);

    status.textContent = `Failed: ${alt}`;
    status.style.color = '#ea4335';
  };

  overlay.insertBefore(img, status);      // insert before the status line
  img.src = src;                          // set src last
}

  /* ───────── Caption observer with retry logic ───────── */
  function sendCaptionWithRetry(text, retries = 3) {
    const now = Date.now();
    
    if (now - lastCaptionTime < 1000) return;
    lastCaptionTime = now;
    
    function attemptSend(remaining) {
      chrome.runtime.sendMessage(
        { type: 'newCaption', text },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(`Send failed, ${remaining} retries left:`, chrome.runtime.lastError);
            if (remaining > 0) {
              setTimeout(() => attemptSend(remaining - 1), 1000);
            } else {
              scheduleReconnect();
            }
          } else {
            console.log('Caption sent successfully:', text);
            clearReconnectInterval();
          }
        }
      );
    }
    
    attemptSend(retries);
  }

  function handle(mutations) {
    for (const mut of mutations) {
      const node = [...mut.addedNodes]
        .find(n => n.nodeType === 1 && n.innerText?.trim());
      if (node) {
        sendCaptionWithRetry(node.innerText);
        break;
      }
    }
  }

  function start() {
    if (active) return;
    active = true;
    
    console.log('Starting sign translator...');
    ensureOverlay();
    ensureConnection();
    
    chrome.runtime.sendMessage({ type: 'activateExtension' });

    const attach = () => {
      if (!active) return;
      
      const targets = [
        '.caption-window.ytp-caption-window-rollup',
        '.ytp-live-caption-window',
        '.ytp-caption-segment',
        '.ytp-caption-window-container',
        '.html5-video-container .ytp-caption-segment'
      ];
      
      let target = null;
      for (const selector of targets) {
        target = document.querySelector(selector);
        if (target) {
          console.log('Found caption target:', selector);
          break;
        }
      }

      if (target && !observer) {
        observer = new MutationObserver(handle);
        observer.observe(target, { 
          childList: true, 
          subtree: true,
          characterData: true 
        });
        clearInterval(poll);
        poll = null;
        
        const status = document.querySelector('#sign-status');
        if (status) {
          status.textContent = 'Connected to captions';
          status.style.color = '#34a853';
        }
        
        console.log('Observer attached to:', target);
      }
    };

    attach();
    if (!observer) {
      poll = setInterval(attach, 2000);
    }
  }

  function stop() {
    active = false;
    console.log('Stopping sign translator...');
    
    observer?.disconnect();
    observer = null;
    clearInterval(poll);
    poll = null;
    clearReconnectInterval();
    
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  /* ───────── Message router ───────── */
 chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      if (msg.type === 'toggleTranslation') {
        if (msg.action === 'start') {
          start();
        } else {
          stop();
        }
        sendResponse({success: true});
        return;
      }

      if (msg.type === 'displaySign' && active && msg.signs.length > 0) {
        cycleSigns(msg.signs);
        sendResponse({success: true});
        return;
      }
    } catch (error) {
      console.error('Error in message handler:', error);
      sendResponse({success: false, error: error.message});
    }
  });

  // Animation state
  let currentAnim = null;

  function cycleSigns(signs) {
  if (currentAnim) {
    clearTimeout(currentAnim);
    currentAnim = null;
  }

  // Deduplicate by word only (shows the first image for each unique word)
  const seen = new Set();
  const uniqueSigns = [];
  for (const s of signs) {
    if (!seen.has(s.word)) {
      uniqueSigns.push(s);
      seen.add(s.word);
    }
  }

  let idx = 0;
  const speed = 200; // ms per word — make it faster here (try 200–400)

  function showNext() {
    const sign = uniqueSigns[idx];
    if (sign && sign.imageUrl) {
      show(sign.imageUrl, sign.word);
    } else {
      ensureOverlay();
      const oldImg = overlay.querySelector('img');
      if (oldImg) oldImg.remove();
      const status = overlay.querySelector('#sign-status');
      if (status) status.textContent = `No sign for: ${sign.word}`;
    }
    idx++;
    if (idx < uniqueSigns.length) {
      currentAnim = setTimeout(showNext, speed);
    } else {
      currentAnim = null;
    }
  }
  showNext();
}

  /* ───────── Auto-start functionality ───────── */
  handlePageChange();
  
  if (window.location.hostname === 'www.youtube.com') {
    console.log('YouTube detected, auto-starting in 3 seconds...');
    setTimeout(() => {
      if (!active) start();
    }, 3000);
  }

  console.log('Sign translator content script loaded and ready');
}