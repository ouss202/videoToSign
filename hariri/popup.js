document.getElementById('send').addEventListener('click', () => {
  const text = document.getElementById('textInput').value.trim().toLowerCase();

  const wordToImage = {
    "hello": "https://cdn.pixabay.com/photo/2018/03/04/22/25/any-person-not-3199425_640.jpg",
    "thanks": "https://cdn.pixabay.com/photo/2018/10/06/23/38/asl-3726880_640.jpg",
    "yes": "https://www.freeiconspng.com/thumbs/yes-png/yes-check-mark-png-21.png",
    "no": "https://cdn.pixabay.com/photo/2017/06/10/07/20/no-2387349_640.jpg"
  };

  if (text in wordToImage) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (word, imageUrl) => {
          let existing = document.getElementById('sign-overlay');
          if (existing) existing.remove(); // Remove previous overlay

          const div = document.createElement('div');
          div.id = 'sign-overlay';
          div.style.position = 'fixed';
          div.style.bottom = '10px';
          div.style.right = '10px';
          div.style.width = '200px';
          div.style.height = '200px';
          div.style.backgroundColor = 'white';
          div.style.zIndex = '9999';
          div.style.display = 'flex';
          div.style.flexDirection = 'column';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.style.padding = '5px';
          div.style.border = '1px solid #ccc';
          div.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';

          const close = document.createElement('button');
          close.textContent = '✖';
          close.style.marginBottom = '5px';
          close.style.border = 'none';
          close.style.background = 'transparent';
          close.style.cursor = 'pointer';
          close.style.fontSize = '16px';
          close.title = 'Close';
          close.onclick = () => div.remove();

          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = word;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '160px';

          div.appendChild(close);
          div.appendChild(img);
          document.body.appendChild(div);
        },
        args: [text, wordToImage[text]]
      });
    });
  } else {
    alert("This demo supports: hello, thanks, yes, no");
  }
});
