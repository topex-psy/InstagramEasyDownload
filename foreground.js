var IED_reverse = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, pics } = request;
  let detect = [];
  let images = document.querySelectorAll('article[role="presentation"] div[role="presentation"] img[src]');
  if (!images.length) images = document.querySelectorAll('article[role="presentation"] img[srcset][src]');
  if (!images.length) images = [document.querySelector('article[role="presentation"] img[src]')];
  console.log('[IED] detected images', images);
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
  
  if (!IED_reverse && !!!btnNext && pics.length < dotCount) IED_reverse = true;
  else if (IED_reverse && !!!btnPrev && pics.length < dotCount) IED_reverse = false;
  let btnToPress = IED_reverse ? btnPrev : btnNext;

  let dotActive = 0;
  for (let i = 0; i < dotCount; i++) {
    if (dotWrapper.childNodes[i].classList.length > 1) {
      dotActive = i;
      break;
    }
  }
  switch (action) {
    case 'detectPics':
      if (pics.length != dotCount) btnToPress?.click();
      sendResponse({result: detect, total: dotCount ? dotCount : 1});
      break;
  }
});