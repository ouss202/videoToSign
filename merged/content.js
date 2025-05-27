
(function() {
    let overlay = null;
    let observer = null;

    const wordToSign = {
        "hello": "https://www.freeiconspng.com/thumbs/yes-png/yes-check-mark-png-21.png",
        "how": "https://www.freeiconspng.com/thumbs/yes-png/yes-check-mark-png-21.png",
        "are": "https://www.freeiconspng.com/thumbs/yes-png/yes-check-mark-png-21.png",
        "you": "https://wallpapers.com/images/hd/pointing-finger-gesture-isolated-lsrkwlzawxq3et5i.png",
        "thank": "https://image.similarpng.com/file/similarpng/very-thumbnail/2020/12/Golden-Thanks--word-premium-vector-PNG.png"
        // Add more mappings here
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
