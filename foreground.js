chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, next } = request;
  console.log("[IED] got action:", action, next);
  
  switch (action) {
    case 'bulkDownload':
      let bulkDownload = false;
      let firstPost = document.querySelector('a[href^="/p/"]');
      if (firstPost) {
        if (firstPost.href.includes('liked_by')) {
          alert("Please open an Instagram account page.");
        } else if (confirm("Are you sure you want to mass download all photos and videos in this Instagram?\n\n1. Click the first (newest) post to start bulk download.\n2. Press Esc anytime to stop the operation.")) {
          bulkDownload = true;
          // firstPost.click();
        }
      } else {
        alert('No post found in this page!');
      }
      sendResponse({result: bulkDownload});
      break;
    case 'nextPost':
      let button = document.querySelector('body > div[role="presentation"] > div:nth-child(2) > div > div:last-child > button');
      let buttonLabel = button?.querySelector('svg').getAttribute('aria-label');
      let onNext = buttonLabel == 'Next';
      if (onNext) button.click(); else alert("Last post has been reached. Bulk download finished!");
      sendResponse({result: onNext});
      break;
    case 'putDownloadButton':
      sendResponse({result: 'ok'});
      break;
    case 'detectPics':
      let photos = [];
      let videos = [];
      if (window.location.host == 'twitter.com') {
        document.querySelectorAll('article a').forEach((a) => {
          if (a.href.includes('/photo/')) {
            let thumbSrc = a.querySelector('img').src;
            let thumbSize = thumbSrc.split('name=').pop().split('&')[0];
            photos.push(thumbSrc.replace(`name=${thumbSize}`,'name=large'));
          }
        });
        document.querySelectorAll('article video').forEach((v) => {
          videos.push(v.poster);
        });
        console.log("[IED] got photos:", photos);
        console.log("[IED] got videos:", videos);
        sendResponse({result: photos, videos: videos, total: photos.length});
        break;
      }
      let images = document.querySelectorAll('article[role="presentation"] div[role="presentation"] img[src]');
      if (!images.length) images = document.querySelectorAll('article[role="presentation"] img[srcset][src]');
      if (!images.length) images = [document.querySelector('article[role="presentation"] img[src]')];
      images.forEach(img => {
        // if (img.hasAttribute('srcset')) {
        //   let srcset = img.getAttribute('srcset');
        //   let src = srcset.split(' ')[0];
        //   photos.push(src);
        // } else {
          if (!!img && !img.src.includes('_s150x150')) photos.push(img.src); // exclude ?stp=dst-jpg_s150x150
        // }
      });

      let btnNext = document.querySelector('button[aria-label="Next"]');
      let btnPrev = document.querySelector('button[aria-label="Go Back"]');
      let btnNextPrev = document.querySelector('button[aria-label="Next"],button[aria-label="Go Back"]');

      let dotWrapper = btnNextPrev?.parentElement.parentElement.parentElement.nextElementSibling;
      let dotCount = dotWrapper?.childElementCount || 0;
      let btnToPress = next ? btnNext : btnPrev;
      // let dotActive = 0;
      // for (let i = 0; i < dotCount; i++) {
      //   if (dotWrapper.childNodes[i].classList.length > 1) {
      //     dotActive = i;
      //     break;
      //   }
      // }

      // console.log('[IED] pics.length', pics.length);
      // console.log('[IED] dotCount', dotCount);
      // console.log('[IED] next', next);
      // console.log('[IED] btnToPress', btnToPress);
      // console.log('[IED] canContinue', !!btnToPress);
      // console.log('[IED] btnNext', btnNext);
      // console.log('[IED] btnPrev', btnPrev);
      // if (pics.length != dotCount) btnToPress?.click();
      btnToPress?.click();
      sendResponse({
        result: photos,
        total: dotCount ? dotCount : 1,
        canContinue: !!btnToPress,
      });
      break;
  }
});

function __IED_clickIcon() {
  chrome.runtime?.sendMessage({action: 'clickIcon', url: window.location.href}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.warn('[IED] clickIcon error', error.message);
    console.log('[IED] clickIcon response', response);
  });
}

document.onkeydown = (e) => {
  if (e.key === "Escape") {
    // e.preventDefault();
    chrome.runtime?.sendMessage({action: 'escapeKey', url: window.location.href}, function(response) {
      let error = chrome.runtime.lastError;
      if (error) return console.warn('[IED] escapeKey error', error.message);
      console.log('[IED] escapeKey response', response);
    });
  }
};