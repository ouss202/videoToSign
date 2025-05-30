// Simplified popup.js
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('start');
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = `
    margin-top: 15px;
    font-size: 12px;
    text-align: center;
    color: #333;
    min-height: 20px;
  `;
  toggleButton.after(statusDiv);

  let isActive = false;

  // Send message with retry
  async function sendMessage(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (error.message.includes('Receiving end does not exist')) {
        // Inject content script and retry
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
        return await chrome.tabs.sendMessage(tabId, message);
      }
      throw error;
    }
  }

  toggleButton.addEventListener('click', async () => {
    toggleButton.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url.includes('youtube.com')) {
        statusDiv.textContent = "❌ Please open a YouTube video";
        return;
      }

      if (!isActive) {
        statusDiv.textContent = "🔄 Starting...";
        
        const response = await sendMessage(tab.id, {
          type: 'toggleTranslation',
          action: 'start'
        });

        if (response?.success) {
          isActive = true;
          toggleButton.textContent = "Stop Translation";
          toggleButton.style.backgroundColor = "#d93025";
          statusDiv.textContent = "✅ Translation active";
        } else {
          statusDiv.textContent = "❌ Failed to start";
        }
      } else {
        statusDiv.textContent = "🔄 Stopping...";
        
        await sendMessage(tab.id, {
          type: 'toggleTranslation',
          action: 'stop'
        });
        
        isActive = false;
        toggleButton.textContent = "Start Translation";
        toggleButton.style.backgroundColor = "#4285f4";
        statusDiv.textContent = "✅ Ready";
      }
    } catch (error) {
      console.error("Error:", error);
      statusDiv.textContent = "❌ Error - try refreshing page";
      isActive = false;
      toggleButton.textContent = "Start Translation";
      toggleButton.style.backgroundColor = "#4285f4";
    } finally {
      toggleButton.disabled = false;
    }
  });

  // Check initial state
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.url.includes('youtube.com')) {
      statusDiv.textContent = "✅ Ready for YouTube";
    } else {
      statusDiv.textContent = "ℹ️ Open YouTube first";
    }
  });
});
