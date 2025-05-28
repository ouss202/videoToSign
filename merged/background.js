// ------------------------------------------------------------------
// 0.  Normalise helper (unchanged)
// ------------------------------------------------------------------
function norm(raw) {
  return raw
    .normalize('NFKD')
    .replace(/[’‘`´]/g, "'")   // curly → straight
    .replace(/[^a-zA-Z']/g, '')// keep letters + '
    .toLowerCase();
}

// ------------------------------------------------------------------
// 1.  ORIGINAL dictionary (raw keys, any spaces/punctuation)
// ------------------------------------------------------------------
const RAW_SIGNS = {
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

// ------------------------------------------------------------------
// 1-b.  Build a **normalised** lookup table  «NEW»
// ------------------------------------------------------------------
const SIGNS = {};
for (const [key, url] of Object.entries(RAW_SIGNS)) {
  SIGNS[norm(key)] = url;          // e.g. "daily routines" → "dailyroutines"
}

// ------------------------------------------------------------------
// 2.  Small in-memory cache (unchanged)
// ------------------------------------------------------------------
const cache = {};

// 3.  Listen for captions (unchanged)
chrome.runtime.onMessage.addListener((req, sender) => {
  if (req.type === 'newCaption') {
    const signs = captionToSigns(req.text);
    chrome.tabs.sendMessage(sender.tab.id, { type: 'displaySign', signs });
  }
});

// 4.  Caption → array {word, imageUrl}  (unchanged)
function captionToSigns(text) {
  const tokens = tokenize(text);
  return tokens.map(t => cache[t] || (cache[t] = {
    word: t,
    imageUrl: SIGNS[t] || null
  }));
}

// 5.  Tokeniser (unchanged)
function tokenize(line) {
  const w   = line.split(/\s+/);
  const out = [];
  for (let i = 0; i < w.length; i++) {
    const one = norm(w[i]);
    const two = norm(w[i] + ' ' + (w[i + 1] || ''));
    if (SIGNS[two]) { out.push(two); i++; }  // phrase match
    else             out.push(one);
  }
  return out;
}
