// Cache for word ⇒ imageUrl so we don't refetch the same sign
const signCache = {};

// Handle captions arriving from the content script
chrome.runtime.onMessage.addListener((req, sender) => {
  if (req.type === 'newCaption') {
    processCaption(req.text, sender.tab.id);
  }
});

// Split caption → fetch all sign images → send back to content script
async function processCaption(text, tabId) {
  const words = text.split(/\s+/).filter(Boolean);
  const signPromises = words.map(getSignForWord);
  const signs = await Promise.all(signPromises);

  chrome.tabs.sendMessage(tabId, { type: 'displaySign', signs });
}

// Fetch/parse a single word (runs in the worker ▶ use DOMParser, no <div>)
async function getSignForWord(word) {
  const clean = word.replace(/[^a-zA-Z']/g, '').toLowerCase();
  if (signCache[clean]) return signCache[clean];

  try {
    const res  = await fetch(
      `https://wecapable.com/tools/text-to-sign-language-converter/?word=${encodeURIComponent(clean)}`
    );
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const img  = doc.querySelector('.sign-image img');

    return (signCache[clean] = {
      word: clean,
      imageUrl: img?.src || null
    });
  } catch (e) {
    console.error('sign fetch failed:', e);
    return { word: clean, imageUrl: null };
  }
}
