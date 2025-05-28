document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('start');
    const statusDisplay = document.createElement('div');
    statusDisplay.style.marginTop = '10px';
    statusDisplay.style.fontSize = '12px';
    statusDisplay.style.minHeight = '40px';
    toggleButton.after(statusDisplay);

    let isActive = false;

    async function sendMessageToContentScript(tabId, message) {
        try {
            return await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
            console.error("Message error:", error);
            throw error;
        }
    }

    toggleButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            if (!tab) {
                statusDisplay.textContent = "No active tab found";
                return;
            }

            if (!tab.url.includes('youtube.com')) {
                statusDisplay.textContent = "Please open a YouTube video first";
                return;
            }

            if (!isActive) {
                statusDisplay.textContent = "Starting translation...";
                
                try {
                    // Inject content script
                    await chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        files: ['content.js']
                    });

                    // Verify connection
                    const pingResponse = await sendMessageToContentScript(tab.id, {type: 'ping'});
                    if (!pingResponse?.ready) {
                        throw new Error("Content script not ready");
                    }

                    // Start translation
                    await sendMessageToContentScript(tab.id, {
                        type: 'toggleTranslation',
                        action: 'start'
                    });

                    isActive = true;
                    toggleButton.textContent = "Stop";
                    statusDisplay.textContent = "Translation active - watching captions";
                } catch (error) {
                    console.error("Start error:", error);
                    statusDisplay.textContent = "Error starting - refresh page";
                    throw error;
                }
            } else {
                statusDisplay.textContent = "Stopping translation...";
                await sendMessageToContentScript(tab.id, {
                    type: 'toggleTranslation',
                    action: 'stop'
                });
                isActive = false;
                toggleButton.textContent = "Start";
                statusDisplay.textContent = "Ready to translate";
            }
        } catch (error) {
            console.error("Error:", error);
            statusDisplay.textContent = "Error - see console";
            toggleButton.textContent = "Start";
            isActive = false;
        }
    });

    // Initial status
    statusDisplay.textContent = "Ready to translate";
});