document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('btn');
  let isActive = false;

  // Check current status
  async function updateStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if background script is responsive
      chrome.runtime.sendMessage(
        { type: 'extensionStatus' },
        (response) => {
          if (chrome.runtime.lastError) {
            btn.textContent = 'Service Offline - Click to Start';
            btn.style.background = '#ea4335';
            isActive = false;
          } else {
            isActive = response?.isActive || false;
            if (isActive) {
              btn.textContent = 'Active - Click to Stop';
              btn.style.background = '#34a853';
            } else {
              btn.textContent = 'Click to Start';
              btn.style.background = '#4285f4';
            }
          }
        }
      );
    } catch (e) {
      console.error('Status check failed:', e);
      btn.textContent = 'Error - Click to Retry';
      btn.style.background = '#ea4335';
    }
  }

  // Initial status check
  await updateStatus();

  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      btn.textContent = 'Working...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Always inject the script first
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Small delay to let content script initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Toggle the extension
      const action = isActive ? 'stop' : 'start';
      
      await chrome.tabs.sendMessage(tab.id, {
        type: 'toggleTranslation',
        action: action
      });

      // Update status
      isActive = !isActive;
      
      if (isActive) {
        btn.textContent = 'Active - Click to Stop';
        btn.style.background = '#34a853';
      } else {
        btn.textContent = 'Stopped - Click to Start';
        btn.style.background = '#4285f4';
      }

    } catch (e) {
      console.error('Toggle failed:', e);
      
      if (e.message.includes('Could not establish connection')) {
        btn.textContent = 'Page needs refresh - Try again';
        btn.style.background = '#ff9800';
      } else {
        btn.textContent = 'Error - Try refreshing page';
        btn.style.background = '#ea4335';
      }
    } finally {
      btn.disabled = false;
    }
  });

  // Update status every few seconds
  setInterval(updateStatus, 5000);
});
