
(function() {
    let overlay = null;
    let observer = null;

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
        
    };

    function createOverlay() {
        overlay = document.getElementById('sign-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sign-overlay';
            overlay.style.position = 'fixed';
            overlay.style.bottom = '20px';
            overlay.style.right = '20px';
            overlay.style.width = '200px';
            overlay.style.height = '200px';
            overlay.style.backgroundColor = 'white';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            document.body.appendChild(overlay);
        }
    }

    function renderSign(word) {
        const imgSrc = wordToSign[word.toLowerCase()];
        if (!imgSrc) return;

        createOverlay();
        overlay.innerHTML = '';
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = word;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        overlay.appendChild(img);
    }

    function handleCaptions(mutationsList) {
        for (const mutation of mutationsList) {
            const captionNode = Array.from(mutation.addedNodes).find(node => node.nodeType === 1 && node.innerText);
            if (captionNode) {
                const words = captionNode.innerText.split(/\s+/);
                console.log("🔤 Caption words:", words);
                words.forEach(renderSign);
                break;
            }
        }
    }

    function initObserver() {
        const targetNode = document.querySelector('.caption-window.ytp-caption-window-rollup');
        if (!targetNode) return;
        observer = new MutationObserver(handleCaptions);
        observer.observe(targetNode, { childList: true, subtree: true });
        console.log("👀 Caption observer started.");
    }

    // Retry until captions are ready
    const interval = setInterval(() => {
        const node = document.querySelector('.caption-window.ytp-caption-window-rollup');
        if (node) {
            clearInterval(interval);
            initObserver();
        }
    }, 1000);
})();
