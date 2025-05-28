// ------------------------------------------------------------------
// 1.  Sign dictionary  (all keys are lowercase)
// ------------------------------------------------------------------
const SIGNS = {
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

// Simple in-memory cache so we don’t rebuild the same object
const cache = {};

// ------------------------------------------------------------------
// 2.  Listen for caption text coming from content.js
// ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((req, sender) => {
  if (req.type === 'newCaption') {
    const signs = captionToSigns(req.text);
    chrome.tabs.sendMessage(sender.tab.id, { type: 'displaySign', signs });
  }
});

// ------------------------------------------------------------------
// 3.  Convert caption line → array of {word, imageUrl}
//     • Handles two-word phrases in SIGNS
// ------------------------------------------------------------------
function captionToSigns(text) {
  const tokens = tokenize(text);
  return tokens.map(t => {
    if (cache[t]) return cache[t];
    return (cache[t] = { word: t, imageUrl: SIGNS[t] || null });
  });
}

// Very small “tokenizer”: tries 2-word phrase first, else 1-word
function tokenize(line) {
  const w = line.split(/\s+/);
  const res = [];
  for (let i = 0; i < w.length; i++) {
    const one = norm(w[i]);
    const two = norm(w[i] + ' ' + (w[i + 1] || ''));
    if (SIGNS[two]) { res.push(two); i++; }        // phrase hit
    else             res.push(one);
  }
  return res;
}

// Normalise: lowercase, ASCII apostrophe, strip punctuation
function norm(raw) {
  return raw
    .normalize('NFKD')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-zA-Z']/g, '')
    .toLowerCase();
}
