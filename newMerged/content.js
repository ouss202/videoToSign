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

        // Sign Language Dictionary (with optimized image URLs)
        const wordToSign = {
            "daily routines": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "hi": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/hello.svg",
            "mom": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
            "i'm enjoying": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/enjoy.svg",
            "life": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/nature.svg",
            "new zealand": "https://cdn.britannica.com/18/3018-050-9EB93A42/New-Zealand.jpg",
            "countryside": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
            "beautiful": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/beautiful.svg",
            "six": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
            "wake": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
            "o'clock": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
            "morning": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "go": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/go.svg",
            "run": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s"
        };

        // Preload all sign images
        function preloadImages() {
            console.log("Preloading sign images...");
            Object.entries(wordToSign).forEach(([word, url]) => {
                const img = new Image();
                img.src = url;
                imageCache[word] = img;
            });
        }

        // Create the overlay container
        function createOverlay() {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sign-overlay';
                overlay.style.position = 'fixed';
                overlay.style.bottom = '80px'; // Moved up to avoid YouTube controls
                overlay.style.right = '20px';
                overlay.style.width = '250px'; // Slightly larger
                overlay.style.height = '250px';
                overlay.style.backgroundColor = 'rgba(255,255,255,0.95)';
                overlay.style.border = '2px solid #4285f4';
                overlay.style.borderRadius = '12px';
                overlay.style.zIndex = '10000'; // Higher than YouTube's UI
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                overlay.style.padding = '10px';
                overlay.style.boxSizing = 'border-box';
                overlay.style.fontFamily = 'Arial, sans-serif';
                document.body.appendChild(overlay);
            }
            return overlay;
        }

        // Display a sign for a specific word
        function renderSign(word) {
            const lowerWord = word.toLowerCase();
            if (!wordToSign[lowerWord]) return;

            const overlay = createOverlay();
            const imgSrc = wordToSign[lowerWord];
            const cachedImg = imageCache[lowerWord];

            overlay.innerHTML = '';
            
            if (cachedImg && cachedImg.complete) {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = word;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                img.style.objectFit = 'contain';
                overlay.appendChild(img);
            } else {
                overlay.innerHTML = `
                    <div style="text-align: center; padding: 10px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">${word}</div>
                        <div style="color: #666;">Loading sign...</div>
                    </div>
                `;
                const img = new Image();
                img.src = imgSrc;
                img.onload = function() {
                    overlay.innerHTML = '';
                    const loadedImg = document.createElement('img');
                    loadedImg.src = imgSrc;
                    loadedImg.alt = word;
                    loadedImg.style.maxWidth = '100%';
                    loadedImg.style.maxHeight = '100%';
                    loadedImg.style.objectFit = 'contain';
                    overlay.appendChild(loadedImg);
                };
            }
        }

        // Process caption text into displayable words/phrases
        function processCaption(text) {
            // Check for multi-word phrases first
            const phrases = Object.keys(wordToSign)
                .filter(phrase => phrase.includes(' ') && text.toLowerCase().includes(phrase));
            
            if (phrases.length > 0) {
                return [phrases[0]]; // Return the first matching phrase
            }
            
            // Then process individual words
            return text.split(/\s+/)
                .filter(word => word.length > 0 && wordToSign[word.toLowerCase()]);
        }

        // Handle caption mutations
        function handleCaptions(mutationsList) {
            for (const mutation of mutationsList) {
                const captionNode = Array.from(mutation.addedNodes).find(node => 
                    node.nodeType === 1 && node.innerText
                );
                
                if (captionNode) {
                    const captionText = captionNode.innerText.trim();
                    currentWords = processCaption(captionText);
                    
                    if (currentWords.length === 0) return;
                    
                    console.log("Processing:", currentWords);
                    
                    // Clear previous interval
                    if (signInterval) clearInterval(signInterval);
                    
                    // Show first word immediately
                    currentWordIndex = 0;
                    renderSign(currentWords[currentWordIndex]);
                    currentWordIndex++;
                    
                    // Schedule remaining words
                    if (currentWords.length > 1) {
                        signInterval = setInterval(() => {
                            if (currentWordIndex < currentWords.length) {
                                renderSign(currentWords[currentWordIndex]);
                                currentWordIndex++;
                            } else {
                                clearInterval(signInterval);
                            }
                        }, WORD_DISPLAY_DURATION);
                    }
                    break;
                }
            }
        }

        // Find the caption container with multiple fallback options
        function findCaptionContainer() {
            const selectors = [
                '.ytp-caption-window-bottom', // New YouTube
                '.caption-window.ytp-caption-window-rollup', // Old YouTube
                'div.ytp-caption-window', // Alternative
                'div.captions-text', // Fallback
                'div[aria-live="polite"]' // Accessibility fallback
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log("Found caption container using selector:", selector);
                    return element;
                }
            }
            console.warn("No caption container found with any selector");
            return null;
        }

        // Initialize mutation observer with retry logic
        function initObserver() {
            const targetNode = findCaptionContainer();
            
            if (!targetNode) {
                console.warn("Caption container not found - will retry");
                setTimeout(initObserver, 1000); // Retry after 1 second
                return;
            }
            
            if (observer) {
                observer.disconnect();
            }
            
            observer = new MutationObserver(handleCaptions);
            observer.observe(targetNode, { 
                childList: true, 
                subtree: true,
                characterData: true
            });
            console.log("Caption observer successfully started");
        }

        // Message listener for popup communication
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("Received message:", request);
            
            if (request.type === 'ping') {
                sendResponse({ready: true});
                return true;
            }

            if (request.type === 'toggleTranslation') {
                if (request.action === 'start') {
                    if (!observer) {
                        initObserver();
                        console.log("Translation started via message");
                    }
                    sendResponse({success: true});
                } else if (request.action === 'stop') {
                    if (observer) {
                        observer.disconnect();
                        observer = null;
                    }
                    if (overlay) {
                        overlay.remove();
                        overlay = null;
                    }
                    if (signInterval) {
                        clearInterval(signInterval);
                        signInterval = null;
                    }
                    console.log("Translation stopped via message");
                    sendResponse({success: true});
                }
                return true;
            }
        });

        // Initialize when injected
        preloadImages();
        
        // Start with a slight delay to ensure YouTube is loaded
        setTimeout(() => {
            initObserver();
            
            // Additional check in case captions load after our initial check
            const checkInterval = setInterval(() => {
                if (!observer && findCaptionContainer()) {
                    initObserver();
                }
            }, 2000);
            
            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkInterval), 10000);
        }, 500);

        // Cleanup when page unloads
        window.addEventListener('beforeunload', () => {
            if (observer) observer.disconnect();
            if (signInterval) clearInterval(signInterval);
        });
    })();
} else {
    console.error("Chrome runtime API not available in this context");
}