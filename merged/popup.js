document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('start');
  let enabled = false;

  btn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 1. inject the content script exactly once
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files : ['content.js']
      });

      // 2. toggle translation
      await chrome.tabs.sendMessage(tab.id, {
        type  : 'toggleTranslation',
        action: enabled ? 'stop' : 'start'
      });

      enabled = !enabled;
      btn.textContent = enabled ? 'Stop' : 'Start';
    } catch (e) {
      console.error(e);
      alert('Please refresh the YouTube tab and try again.');
    }
  });
});
