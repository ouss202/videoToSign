// Wrap everything in a check for chrome API availability
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    (function() {
        console.log("Sign Language Translator - Content Script Loaded");
        
        // DOM Elements
        let overlay = null;
        let observer = null;
        
        // Translation State
        let currentWordIndex = 0;
        let currentWords = [];
        let signInterval = null;
        const WORD_DISPLAY_DURATION = 1500; // 1.5 seconds per sign
        const imageCache = {}; // Cache for loaded images
        let isTranslationActive = false;

        // Sign Language Dictionary with better fallbacks
        const wordToSign = {
            "daily": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "routines": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "daily routines": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "hi": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/hello.svg",
            "hello": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/hello.svg",
            "mom": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
            "mother": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
            "enjoying": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/enjoy.svg",
            "enjoy": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/enjoy.svg",
            "life": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/nature.svg",
            "new": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/new.svg",
            "new zealand": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
            "countryside": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
            "country": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
            "beautiful": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/beautiful.svg",
            "six": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
            "6": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
            "wake": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
            "up": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
            "wake up": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
            "time": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
            "o'clock": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
            "morning": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "go": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/go.svg",
            "run": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s",
            "running": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s"
        };

        // Preload images with error handling and retry logic
        function preloadImages() {
            console.log("Preloading sign images...");
            const loadPromises = Object.entries(wordToSign).map(([word, url]) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous"; // Handle CORS issues
                    
                    img.onload = () => {
                        imageCache[word] = { img, loaded: true, url };
                        console.log(`✓ Loaded: ${word}`);
                        resolve();
                    };
                    
                    img.onerror = () => {
                        console.warn(`✗ Failed to load: ${word} - ${url}`);
                        imageCache[word] = { img: null, loaded: false, url };
                        resolve(); // Don't block other images
                    };
                    
                    img.src = url;
                });
            });
            
            Promise.all(loadPromises).then(() => {
                console.log("Image preloading completed");
            });
        }

        // Create the overlay container with improved styling
        function createOverlay() {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sign-overlay';
                overlay.style.cssText = `
                    position: fixed !important;
                    bottom: 80px !important;
                    right: 20px !important;
                    width: 250px !important;
                    height: 250px !important;
                    background-color: rgba(255,255,255,0.95) !important;
                    border: 2px solid #4285f4 !important;
                    border-radius: 12px !important;
                    z-index: 2147483647 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    padding: 10px !important;
                    box-sizing: border-box !important;
                    font-family: Arial, sans-serif !important;
                    pointer-events: none !important;
                `;
                document.body.appendChild(overlay);
            }
            return overlay;
        }

        // Display a sign for a specific word with better error handling
        function renderSign(word) {
            if (!isTranslationActive) return;
            
            const lowerWord = word.toLowerCase().trim();
            const cached = imageCache[lowerWord];
            
            if (!cached || !wordToSign[lowerWord]) {
                console.log(`No sign available for: "${word}"`);
                return;
            }

            const overlay = createOverlay();
            overlay.innerHTML = '';
            
            if (cached.loaded && cached.img) {
                const img = document.createElement('img');
                img.src = cached.url;
                img.alt = `Sign for ${word}`;
                img.style.cssText = `
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: contain !important;
                    display: block !important;
                `;
                overlay.appendChild(img);
                console.log(`Displaying sign for: ${word}`);
            } else {
                overlay.innerHTML = `
                    <div style="text-align: center; padding: 10px; color: #333;">
                        <div style="font-weight: bold; margin-bottom: 5px;">${word}</div>
                        <div style="color: #666; font-size: 12px;">Sign not available</div>
                    </div>
                `;
            }
        }

        // Improved caption processing with better word matching
        function processCaption(text) {
            if (!text || text.trim().length === 0) return [];
            
            const normalizedText = text.toLowerCase().trim();
            const foundWords = [];
            
            // Check for multi-word phrases first (longer phrases have priority)
            const phrases = Object.keys(wordToSign)
                .filter(phrase => phrase.includes(' '))
                .sort((a, b) => b.length - a.length); // Sort by length, longest first
            
            for (const phrase of phrases) {
                if (normalizedText.includes(phrase)) {
                    foundWords.push(phrase);
                    break; // Take the first (longest) matching phrase
                }
            }
            
            // If no phrases found, process individual words
            if (foundWords.length === 0) {
                const words = normalizedText.split(/\s+/)
                    .map(word => word.replace(/[^\w']/g, '')) // Remove punctuation but keep apostrophes
                    .filter(word => word.length > 0 && wordToSign[word]);
                foundWords.push(...words);
            }
            
            return foundWords.slice(0, 5); // Limit to 5 words to avoid overwhelming
        }

        // Improved caption detection with debouncing
        let captionTimeout = null;
        function handleCaptions(mutationsList) {
            if (!isTranslationActive) return;
            
            // Clear previous timeout to debounce rapid caption changes
            if (captionTimeout) {
                clearTimeout(captionTimeout);
            }
            
            captionTimeout = setTimeout(() => {
                let latestCaption = '';
                
                // Find the most recent caption text
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                                latestCaption = node.textContent.trim();
                            } else if (node.nodeType === Node.ELEMENT_NODE && node.innerText) {
                                latestCaption = node.innerText.trim();
                            }
                        }
                    } else if (mutation.type === 'characterData' && mutation.target.textContent.trim()) {
                        latestCaption = mutation.target.textContent.trim();
                    }
                }
                
                if (latestCaption) {
                    const wordsToShow = processCaption(latestCaption);
                    
                    if (wordsToShow.length === 0) return;
                    
                    console.log("Processing caption:", latestCaption, "-> Words:", wordsToShow);
                    
                    // Clear previous display cycle
                    if (signInterval) {
                        clearInterval(signInterval);
                        signInterval = null;
                    }
                    
                    currentWords = wordsToShow;
                    currentWordIndex = 0;
                    
                    // Show first word immediately
                    renderSign(currentWords[currentWordIndex]);
                    currentWordIndex++;
                    
                    // Schedule remaining words
                    if (currentWords.length > 1) {
                        signInterval = setInterval(() => {
                            if (currentWordIndex < currentWords.length && isTranslationActive) {
                                renderSign(currentWords[currentWordIndex]);
                                currentWordIndex++;
                            } else {
                                clearInterval(signInterval);
                                signInterval = null;
                            }
                        }, WORD_DISPLAY_DURATION);
                    }
                }
            }, 100); // 100ms debounce
        }

        // Enhanced caption container detection
        function findCaptionContainer() {
            const selectors = [
                '.ytp-caption-window-bottom .ytp-caption-segment',
                '.ytp-caption-window-bottom',
                '.caption-window.ytp-caption-window-rollup',
                'div.ytp-caption-window',
                'div.captions-text',
                'div[aria-live="polite"]',
                '.ytp-caption-segment' // Additional selector
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log("Found caption container using selector:", selector);
                    return element;
                }
            }
            
            // Fallback: look for any element with caption-related classes
            const fallbackElements = document.querySelectorAll('[class*="caption"], [class*="subtitle"]');
            if (fallbackElements.length > 0) {
                console.log("Found caption container using fallback");
                return fallbackElements[0];
            }
            
            console.warn("No caption container found");
            return null;
        }

        // Initialize observer with better error handling
        function initObserver() {
            if (!isTranslationActive) return;
            
            const targetNode = findCaptionContainer();
            
            if (!targetNode) {
                console.warn("Caption container not found - will retry in 2 seconds");
                setTimeout(() => {
                    if (isTranslationActive) initObserver();
                }, 2000);
                return;
            }
            
            if (observer) {
                observer.disconnect();
            }
            
            try {
                observer = new MutationObserver(handleCaptions);
                observer.observe(targetNode, { 
                    childList: true, 
                    subtree: true,
                    characterData: true,
                    attributes: false // Reduce noise
                });
                console.log("Caption observer successfully started on:", targetNode.tagName, targetNode.className);
            } catch (error) {
                console.error("Failed to start observer:", error);
                setTimeout(() => {
                    if (isTranslationActive) initObserver();
                }, 3000);
            }
        }

        // Message listener with better error handling
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("Received message:", request);
            
            try {
                if (request.type === 'ping') {
                    sendResponse({ready: true});
                    return true;
                }

                if (request.type === 'toggleTranslation') {
                    if (request.action === 'start') {
                        isTranslationActive = true;
                        initObserver();
                        console.log("Translation started");
                        sendResponse({success: true});
                    } else if (request.action === 'stop') {
                        isTranslationActive = false;
                        if (observer) {
                            observer.disconnect();
                            observer = null;
                        }
                        if (overlay && overlay.parentNode) {
                            overlay.remove();
                            overlay = null;
                        }
                        if (signInterval) {
                            clearInterval(signInterval);
                            signInterval = null;
                        }
                        console.log("Translation stopped");
                        sendResponse({success: true});
                    }
                    return true;
                }
            } catch (error) {
                console.error("Message handling error:", error);
                sendResponse({success: false, error: error.message});
            }
            
            return true; // Keep message channel open
        });

        // Initialize
        preloadImages();
        
        // Don't auto-start - wait for user action
        console.log("Sign Language Translator ready - waiting for user to start");

        // Cleanup when page unloads
        window.addEventListener('beforeunload', () => {
            isTranslationActive = false;
            if (observer) observer.disconnect();
            if (signInterval) clearInterval(signInterval);
            if (overlay && overlay.parentNode) overlay.remove();
        });

        // Handle page navigation in YouTube (SPA)
        let currentUrl = window.location.href;
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log("YouTube navigation detected, reinitializing...");
                if (isTranslationActive) {
                    setTimeout(() => {
                        if (observer) observer.disconnect();
                        initObserver();
                    }, 1000);
                }
            }
        });
        
        urlObserver.observe(document.body, { 
            childList: true, 
            subtree: true 
        });

    })();
} else {
    console.error("Chrome runtime API not available in this context");
}
