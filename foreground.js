chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, pics, next } = request;
  
  switch (action) {
    case 'bulkDownload':
      let bulkDownload = false;
      let firstPost = document.querySelector('a[href^="/p/"]');
      if (firstPost) {
        if (firstPost.href.includes('liked_by')) {
          alert("Please open an Instagram account page.");
        } else if (confirm("Are you sure you want to mass download all photos in this Instagram?\nYou can also open a post to download its photos respectively.")) {
          bulkDownload = true;
          alert("Bulk download will start. Press Esc anytime to stop the operation.");
          firstPost.click();
        }
      } else {
        alert('No post found in this page!');
      }
      sendResponse({result: bulkDownload});
      break;
    case 'nextPost':
      const button = document.querySelector('body > div[role="presentation"] > div:nth-child(2) > div > div:last-child > button');
      const buttonLabel = button?.querySelector('svg').getAttribute('aria-label');
      const onNext = buttonLabel == 'Next';
      if (onNext) button.click();
      sendResponse({result: onNext});
      break;
    case 'detectPics':
      let detect = [];
      let images = document.querySelectorAll('article[role="presentation"] div[role="presentation"] img[src]');
      if (!images.length) images = document.querySelectorAll('article[role="presentation"] img[srcset][src]');
      if (!images.length) images = [document.querySelector('article[role="presentation"] img[src]')];
      images.forEach(img => {
        // if (img.hasAttribute('srcset')) {
        //   let srcset = img.getAttribute('srcset');
        //   let src = srcset.split(' ')[0];
        //   detect.push(src);
        // } else {
          if (!!img) detect.push(img.src);
        // }
      });

      let btnNext = document.querySelector('button[aria-label="Next"]');
      let btnPrev = document.querySelector('button[aria-label="Go Back"]');
      let btnNextPrev = document.querySelector('button[aria-label="Next"],button[aria-label="Go Back"]');

      let dotWrapper = btnNextPrev?.parentElement.parentElement.parentElement.nextElementSibling;
      let dotCount = dotWrapper?.childElementCount || 0;
      
      if (!next && !!!btnNext && pics.length < dotCount) next = true;
      else if (next && !!!btnPrev && pics.length < dotCount) next = false;
      let btnToPress = next ? btnPrev : btnNext;

      let dotActive = 0;
      for (let i = 0; i < dotCount; i++) {
        if (dotWrapper.childNodes[i].classList.length > 1) {
          dotActive = i;
          break;
        }
      }
      if (pics.length != dotCount) btnToPress?.click();
      sendResponse({result: detect, total: dotCount ? dotCount : 1, next: next});
      break;
  }
});

document.onkeydown = (e) => {
  if (e.key === "Escape") {
    // e.preventDefault();
    chrome.runtime?.sendMessage({action: 'escapeKey'}, function(response) {
      let error = chrome.runtime.lastError;
      if (error) {
        console.log('[IED] escapeKey error', error.message);
      } else {
        console.log('[IED] escapeKey response', response);
      }
    });
  }
};