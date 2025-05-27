document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('start');
    let isActive = false;

    toggleButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            if (!isActive) {
                // Inject content script if needed
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['content.js']
                });
                
                // Start translation
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'toggleTranslation',
                    action: 'start'
                });
                
                isActive = true;
                toggleButton.textContent = "Stop";
            } else {
                // Stop translation
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'toggleTranslation',
                    action: 'stop'
                });
                
                isActive = false;
                toggleButton.textContent = "Start";
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Please refresh the YouTube page and try again.");
        }
    });
});