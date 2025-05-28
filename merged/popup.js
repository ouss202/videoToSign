document.addEventListener('DOMContentLoaded', () => {
  const btn      = document.getElementById('btn');
  let   enabled  = false;

  btn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });

      // inject content script exactly once
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files : ['content.js']
      });

      // toggle translation
      await chrome.tabs.sendMessage(tab.id, {
        type: 'toggleTranslation',
        action: enabled ? 'stop' : 'start'
      });

      enabled      = !enabled;
      btn.textContent = enabled ? 'Stop' : 'Start';
    } catch (err) {
      console.error(err);
      alert('Please refresh the YouTube tab and try again.');
    }
  });
});
