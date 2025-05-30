document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('start');
  const statusDisplay = document.createElement('div');
  statusDisplay.style.cssText = `
    margin-top: 10px;
    font-size: 12px;
    min-height: 40px;
    color: #333;
    text-align: center;
  `;
  toggleButton.after(statusDisplay);

  let isActive = false;

  // Improved message sending with better error handling
  async function sendMessageToContentScript(tabId, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error.message);
        
        if (error.message.includes('Receiving end does not exist')) {
          if (attempt === maxRetries) {
            return { ready: false, needsInjection: true };
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          throw error; // Re-throw other errors
        }
      }
    }
  }

  // Inject content script with verification
  async function injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      // Wait for content script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify injection worked
      const pingResponse = await sendMessageToContentScript(tabId, { type: 'ping' }, 1);
      return pingResponse?.ready === true;
    } catch (error) {
      console.error("Content script injection failed:", error);
      return false;
    }
  }

  toggleButton.addEventListener('click', async () => {
    toggleButton.disabled = true; // Prevent multiple clicks
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        statusDisplay.textContent = "❌ No active tab found";
        return;
      }

      if (!tab.url.includes('youtube.com')) {
        statusDisplay.textContent = "❌ Please open a YouTube video first";
        return;
      }

      if (!isActive) {
        statusDisplay.textContent = "🔄 Starting translation...";
        
        try {
          // Check if content script is ready
          let pingResponse = await sendMessageToContentScript(tab.id, { type: 'ping' });
          
          if (!pingResponse?.ready) {
            statusDisplay.textContent = "🔄 Loading extension...";
            const injectionSuccess = await injectContentScript(tab.id);
            
            if (!injectionSuccess) {
              statusDisplay.textContent = "❌ Failed to load - try refreshing the page";
              return;
            }
          }

          // Start translation
          statusDisplay.textContent = "🔄 Activating translation...";
          const startResponse = await sendMessageToContentScript(tab.id, {
            type: 'toggleTranslation',
            action: 'start'
          });

          if (startResponse?.success) {
            isActive = true;
            toggleButton.textContent = "Stop Translation";
            toggleButton.style.backgroundColor = "#d93025"; // Red for stop
            statusDisplay.textContent = "✅ Translation active - watching captions";
          } else {
            statusDisplay.textContent = "❌ Failed to start translation";
          }
        } catch (error) {
          console.error("Start error:", error);
          statusDisplay.textContent = "❌ Error starting - try refreshing the page";
        }
      } else {
        statusDisplay.textContent = "🔄 Stopping translation...";
        
        try {
          await sendMessageToContentScript(tab.id, {
            type: 'toggleTranslation',
            action: 'stop'
          });
          
          isActive = false;
          toggleButton.textContent = "Start Translation";
          toggleButton.style.backgroundColor = "#4285f4"; // Blue for start
          statusDisplay.textContent = "✅ Ready to translate";
        } catch (error) {
          console.error("Stop error:", error);
          statusDisplay.textContent = "❌ Error stopping translation";
        }
      }
    } catch (error) {
      console.error("General error:", error);
      statusDisplay.textContent = "❌ Unexpected error occurred";
      toggleButton.textContent = "Start Translation";
      toggleButton.style.backgroundColor = "#4285f4";
      isActive = false;
    } finally {
      toggleButton.disabled = false; // Re-enable button
    }
  });

  // Check initial state
  async function checkInitialState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url.includes('youtube.com')) {
        statusDisplay.textContent = "✅ Ready to translate YouTube captions";
      } else {
        statusDisplay.textContent = "ℹ️ Open a YouTube video to start";
      }
    } catch (error) {
      statusDisplay.textContent = "ℹ️ Ready to translate";
    }
  }

  checkInitialState();
});
