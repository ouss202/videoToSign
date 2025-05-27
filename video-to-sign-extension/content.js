(function() {
    let overlay = null;
    let observer = null;
    let currentPhrase = '';

    // Simple ASL phrase dictionary (expand this with more signs)
    const ASL_PHRASES = {
        'chrome extensions': '✋👨‍💻',
        'are built using': '🛠️👉',
        'hello world': '👋🌍',
        'thank you': '🙏',
        // Add more phrases here
    };

    function createOverlay() {
        if (document.getElementById('sign-overlay')) return;
        
        overlay = document.createElement('div');
        overlay.id = 'sign-overlay';
        overlay.style.position = 'fixed';
        overlay.style.bottom = '20px';
        overlay.style.right = '20px';
        overlay.style.width = '300px';
        overlay.style.height = '300px';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        overlay.style.borderRadius = '10px';
        overlay.style.zIndex = '9999';
        overlay.style.padding = '10px';
        overlay.style.overflow = 'auto';
        overlay.style.fontSize = '24px';
        overlay.style.textAlign = 'center';
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
        }
    }

    function displayASLPhrase(phrase) {
        if (!overlay) return;
        
        // Clear previous content
        overlay.innerHTML = '';
        
        // Look for matching phrase in dictionary
        const lowerPhrase = phrase.toLowerCase();
        const aslSign = ASL_PHRASES[lowerPhrase] || 
                        translateToFingerspelling(phrase);
        
        const signElement = document.createElement('div');
        signElement.textContent = aslSign;
        signElement.style.margin = '10px';
        overlay.appendChild(signElement);
    }

    function translateToFingerspelling(text) {
        // Simple finger spelling representation
        return text.split('').map(char => {
            if (/[a-z]/.test(char)) return `👆(${char.toUpperCase()})`;
            return char;
        }).join(' ');
    }

    function processCaption(caption) {
        // Store the current phrase
        currentPhrase = caption;
        
        // First try to match complete phrase
        const lowerCaption = caption.toLowerCase();
        if (ASL_PHRASES[lowerCaption]) {
            displayASLPhrase(lowerCaption);
            return;
        }
        
        // If no phrase match, try to find partial matches
        for (const phrase in ASL_PHRASES) {
            if (lowerCaption.includes(phrase)) {
                displayASLPhrase(phrase);
                return;
            }
        }
        
        // Default to finger spelling
        displayASLPhrase(caption);
    }

    function startCaptionMonitoring() {
        if (observer) return;
        
        observer = new MutationObserver(() => {
            const caption = document.querySelector('.ytp-caption-segment')?.textContent?.trim();
            if (caption && caption !== currentPhrase) {
                processCaption(caption);
            }
        });

        const captionArea = document.querySelector('.ytp-caption-window-rollup') || 
                         document.querySelector('.caption-window');
        if (captionArea) {
            observer.observe(captionArea, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    function stopCaptionMonitoring() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        removeOverlay();
        currentPhrase = '';
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'toggleTranslation') {
            if (request.action === 'start') {
                createOverlay();
                startCaptionMonitoring();
                sendResponse({status: 'started'});
            } else {
                stopCaptionMonitoring();
                sendResponse({status: 'stopped'});
            }
            return true;
        }
    });
})();