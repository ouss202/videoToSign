// Dictionary to cache sign language images
const signCache = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'newCaption') {
    processCaption(request.text);
  }
});

async function processCaption(text) {
  // Split into words and filter out empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  // Get signs for each word
  const signPromises = words.map(word => getSignForWord(word));
  const signs = await Promise.all(signPromises);
  
  // Send to content script
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'displaySign',
        signs: signs
      });
    }
  });
}

async function getSignForWord(word) {
  // Clean word (remove punctuation)
  const cleanWord = word.replace(/[^a-zA-Z']/g, '').toLowerCase();
  
  // Check cache first
  if (signCache[cleanWord]) {
    return signCache[cleanWord];
  }
  
  try {
    // Fetch from wecapable.com (this is a simplified approach)
    const response = await fetch(`https://wecapable.com/tools/text-to-sign-language-converter/?word=${encodeURIComponent(cleanWord)}`);
    const html = await response.text();
    
    // Parse the HTML to extract sign image URL
    // Note: This is a simplified approach. In reality, you might need an API
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const signImg = tempDiv.querySelector('.sign-image img');
    
    const signData = {
      word: cleanWord,
      imageUrl: signImg ? signImg.src : null
    };
    
    // Cache the result
    signCache[cleanWord] = signData;
    return signData;
  } catch (error) {
    console.error('Error fetching sign:', error);
    return {
      word: cleanWord,
      imageUrl: null
    };
  }
}