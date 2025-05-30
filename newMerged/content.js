// Optimized Sign Language Translator - Content Script
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    (function() {
        console.log("Sign Language Translator - Content Script Loaded");
        
        // Global state
        let overlay = null;
        let observer = null;
        let isTranslationActive = false;
        let currentSignTimeout = null;
        let lastProcessedText = '';
        let wordQueue = [];
        let currentWordIndex = 0;

        // Simplified and reliable sign dictionary with working URLs
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
            "zealand": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/mommy.svg",
            "countryside": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
            "country": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/country.svg",
            "beautiful": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/beautiful.svg",
            "six": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
            "6": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/number_6.svg",
            "wake": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/wake_up.svg",
            "time": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
            "o'clock": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/time.svg",
            "morning": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/everyday.svg",
            "go": "https://res.cloudinary.com/spiralyze/image/upload/f_auto,w_auto/BabySignLanguage/DictionaryPages/go.svg",
            "run": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s",
            "running": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrey4cJMRQFQ7-VXw5DRpngyZ9qtmPZoAuzA&s"
        };

        // Create overlay immediately when needed
        function createOverlay() {
            if (overlay) return overlay;
            
            overlay = document.createElement('div');
            overlay.id = 'sign-overlay';
            overlay.style.cssText = `
                position: fixed !important;
                bottom: 100px !important;
                right: 20px !important;
                width: 200px !important;
                height: 200px !important;
                background: white !important;
                border: 3px solid #4285f4 !important;
                border-radius: 15px !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
                font-family: Arial, sans-serif !important;
                transition: all 0.3s ease !important;
            `;
            
            document.body.appendChild(overlay);
            return overlay;
        }

        // Show sign with stable display (no twitching)
        function showSign(word) {
            if (!isTranslationActive) return;
            
            const lowerWord = word.toLowerCase().trim();
            const signUrl = wordToSign[lowerWord];
            
            if (!signUrl) return;

            const container = createOverlay();
            
            // Clear any existing timeout to prevent twitching
            if (currentSignTimeout) {
                clearTimeout(currentSignTimeout);
                currentSignTimeout = null;
            }

            // Smooth transition - fade out current content
            container.style.opacity = '0.3';
            
            setTimeout(() => {
                if (!isTranslationActive) return;
                
                // Create and load image
                const img = new Image();
                img.crossOrigin = "anonymous";
                
                img.onload = function() {
                    if (!isTranslationActive) return;
                    
                    container.innerHTML = '';
                    const imgElement = document.createElement('img');
                    imgElement.src = this.src;
                    imgElement.alt = `Sign for ${word}`;
                    imgElement.style.cssText = `
                        max-width: 90% !important;
                        max-height: 90% !important;
                        object-fit: contain !important;
                        border-radius: 8px !important;
                    `;
                    container.appendChild(imgElement);
                    
                    // Smooth fade in
                    container.style.opacity = '1';
                    console.log(`✓ Showing sign for: ${word}`);
                };
                
                img.onerror = function() {
                    if (!isTranslationActive) return;
                    
                    container.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: #666;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #333;">"${word}"</div>
                            <div style="font-size: 12px;">Sign not available</div>
                        </div>
                    `;
                    container.style.opacity = '1';
                };
                
                // Start loading image
                img.src = signUrl;
                
            }, 100); // Small delay for smooth transition
        }

        // Process captions and queue words for display
        function processCaption(text) {
            if (!text || text === lastProcessedText) return [];
            
            const words = text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2 && wordToSign[word]);
            
            // Find new words that weren't in the last caption
            const lastWords = lastProcessedText.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2 && wordToSign[word]);
            
            const newWords = words.filter(word => !lastWords.includes(word));
            lastProcessedText = text;
            
            return newWords;
        }

        // Queue system for smooth word transitions
        function queueWords(words) {
            if (words.length === 0) return;
            
            // Add new words to queue
            wordQueue.push(...words);
            
            // Start processing queue if not already running
            if (!currentSignTimeout && wordQueue.length > 0) {
                processWordQueue();
            }
        }

        function processWordQueue() {
            if (!isTranslationActive || wordQueue.length === 0) {
                currentSignTimeout = null;
                return;
            }
            
            const nextWord = wordQueue.shift();
            showSign(nextWord);
            
            // Schedule next word (2 seconds between words)
            currentSignTimeout = setTimeout(() => {
                processWordQueue();
            }, 2000);
        }

        // Handle caption changes with better detection
        function handleCaptionChange() {
            if (!isTranslationActive) return;
            
            const captionSelectors = [
                '.ytp-caption-segment',
                '.ytp-caption-window-bottom .ytp-caption-segment',
                '.ytp-caption-window-bottom',
                '.caption-window'
            ];
            
            let captionText = '';
            
            for (const selector of captionSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    // Get text from all caption segments
                    captionText = Array.from(elements)
                        .map(el => el.textContent.trim())
                        .filter(text => text.length > 0)
                        .join(' ');
                    break;
                }
            }
            
            if (captionText) {
                const newWords = processCaption(captionText);
                if (newWords.length > 0) {
                    console.log('New words detected:', newWords);
                    queueWords(newWords);
                }
            }
        }

        // Start observing captions
        function startObserver() {
            if (!isTranslationActive) return;
            
            // Find caption container
            const captionContainer = document.querySelector('.ytp-caption-window-bottom') || 
                                   document.querySelector('#movie_player') ||
                                   document.body;
            
            if (observer) {
                observer.disconnect();
            }
            
            observer = new MutationObserver((mutations) => {
                // Debounce rapid changes to prevent excessive processing
                clearTimeout(observer.debounceTimer);
                observer.debounceTimer = setTimeout(() => {
                    handleCaptionChange();
                }, 200);
            });
            
            observer.observe(captionContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            console.log("Caption observer started");
        }

        // Message handler
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("Message received:", request);
            
            if (request.type === 'ping') {
                sendResponse({ready: true});
                return true;
            }

            if (request.type === 'toggleTranslation') {
                if (request.action === 'start') {
                    isTranslationActive = true;
                    startObserver();
                    console.log("Translation started");
                    sendResponse({success: true});
                } else if (request.action === 'stop') {
                    isTranslationActive = false;
                    
                    // Clear all state
                    lastProcessedText = '';
                    wordQueue = [];
                    currentWordIndex = 0;
                    
                    if (observer) {
                        observer.disconnect();
                        observer = null;
                    }
                    
                    if (overlay && overlay.parentNode) {
                        overlay.remove();
                        overlay = null;
                    }
                    
                    if (currentSignTimeout) {
                        clearTimeout(currentSignTimeout);
                        currentSignTimeout = null;
                    }
                    
                    console.log("Translation stopped");
                    sendResponse({success: true});
                }
                return true;
            }
            
            return true;
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            isTranslationActive = false;
            if (observer) observer.disconnect();
            if (overlay) overlay.remove();
        });

        console.log("Sign Language Translator ready");

    })();
} else {
    console.error("Chrome runtime API not available");
}
