// ------------------------------------------------------------------
// Keep service worker alive
// ------------------------------------------------------------------
let keepAliveInterval;

function keepServiceWorkerAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just a simple API call to keep the service worker active
    });
  }, 20000); // Every 20 seconds
}

// Start keeping alive immediately
keepServiceWorkerAlive();

// Restart keepalive if service worker wakes up
chrome.runtime.onStartup.addListener(keepServiceWorkerAlive);
chrome.runtime.onInstalled.addListener(keepServiceWorkerAlive);

// ------------------------------------------------------------------
// Store extension state persistently
// ------------------------------------------------------------------
let extensionState = {
  isActive: false,
  activeTabs: new Set()
};

// ------------------------------------------------------------------
// 0.  Normalise helper
// ------------------------------------------------------------------
function norm(raw) {
  return raw
    .normalize('NFKD')
    .replace(/[''`´]/g, "'")
    .replace(/[^a-zA-Z']/g, '')
    .toLowerCase();
}

// ------------------------------------------------------------------
// 1.  Dictionary
// ------------------------------------------------------------------
const RAW_SIGNS = {
  "daily routines": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
  "hi": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/hello.svg",
  "hello": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/hello.svg",
  "mom": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
  "mommy": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
  "enjoying": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/enjoy.svg",
  "enjoy": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/enjoy.svg",
  "life": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/nature.svg",
  "new": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/new.svg",
  "zealand": "https://cdn.britannica.com/18/3018-050-9EB93A42/New-Zealand.jpg",
  "countryside": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
  "country": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
  "beautiful": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/beautiful.svg",
  "six": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
  "6": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
  "wake": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
  "wake up": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
  "oclock": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
  "time": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
  "morning": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
  "go": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/go.svg",
  "run": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s",
  "i": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/me.svg",
  "me": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/me.svg",
  "my": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/my.svg"
};

const SIGNS = {};
for (const [key, url] of Object.entries(RAW_SIGNS)) {
  const normalizedKey = norm(key);
  SIGNS[normalizedKey] = url;
}

// ------------------------------------------------------------------
// Cache
// ------------------------------------------------------------------
const cache = {};

// ------------------------------------------------------------------
// Message handling with better error handling
// ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    if (req.type === 'newCaption') {
      console.log('Received caption:', req.text);
      const signs = captionToSigns(req.text);
      console.log('Generated signs:', signs);
      
      // Send response back and handle errors
      chrome.tabs.sendMessage(sender.tab.id, { type: 'displaySign', signs })
        .catch(error => {
          console.log('Tab may have been closed or refreshed:', error);
          // Remove from active tabs if message fails
          extensionState.activeTabs.delete(sender.tab.id);
        });
      
      sendResponse({success: true});
    }
    
    if (req.type === 'extensionStatus') {
      sendResponse({
        isActive: extensionState.isActive,
        activeTabsCount: extensionState.activeTabs.size
      });
    }
    
    if (req.type === 'activateExtension') {
      extensionState.isActive = true;
      extensionState.activeTabs.add(sender.tab.id);
      sendResponse({success: true});
    }
    
  } catch (error) {
    console.error('Error in message handler:', error);
    sendResponse({success: false, error: error.message});
  }
  
  return true; // Keep message channel open for async response
});

// ------------------------------------------------------------------
// Tab management - clean up closed tabs
// ------------------------------------------------------------------
chrome.tabs.onRemoved.addListener((tabId) => {
  extensionState.activeTabs.delete(tabId);
  if (extensionState.activeTabs.size === 0) {
    extensionState.isActive = false;
  }
});

// ------------------------------------------------------------------
// Functions
// ------------------------------------------------------------------
function captionToSigns(text) {
  const tokens = tokenize(text);
  console.log('All tokens:', tokens);
  
  const signsFound = tokens
    .map(t => {
      if (cache[t]) return cache[t];
      
      const result = {
        word: t,
        imageUrl: SIGNS[t] || null
      };
      
      cache[t] = result;
      return result;
    })
    .filter(sign => sign.imageUrl !== null);
  
  console.log('Signs with images:', signsFound);
  return signsFound;
}

function tokenize(line) {
  const cleanLine = line.replace(/\[.*?\]/g, '').trim();
  const words = cleanLine.split(/\s+/).filter(w => w.length > 0);
  const out = [];
  
  for (let i = 0; i < words.length; i++) {
    let matched = false;
    
    for (let len = Math.min(3, words.length - i); len >= 2; len--) {
      const phrase = words.slice(i, i + len).join(' ');
      const normalizedPhrase = norm(phrase);
      
      if (SIGNS[normalizedPhrase]) {
        out.push(normalizedPhrase);
        i += len - 1;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      const singleWord = norm(words[i]);
      out.push(singleWord);
    }
  }
  
  return out;
}