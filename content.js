chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, pics } = request;
  let detect = [];
  let images = document.querySelectorAll('article[role="presentation"] div[role="presentation"] img[src]');
  if (!images.length) images = document.querySelectorAll('article[role="presentation"] img[srcset][src]');
  if (!images.length) images = [document.querySelectorAll('article[role="presentation"] img[src]')[0]];
  images.forEach(img => {
    // if (img.hasAttribute('srcset')) {
    //   let srcset = img.getAttribute('srcset');
    //   let src = srcset.split(' ')[0];
    //   detect.push(src);
    // } else {
      detect.push(img.src);
    // }
  });

  let btnNext = document.querySelector('button[aria-label="Next"]');
  let dotWrapper = btnNext?.parentElement.parentElement.parentElement.nextElementSibling;
  let dotCount = dotWrapper?.childElementCount || 0;
  let dotActive = 0;
  for (let i = 0; i < dotCount; i++) {
    if (dotWrapper.childNodes[i].classList.length > 1) {
      dotActive = i;
      break;
    }
  }
  switch (action) {
    case 'detectPics':
      if (pics.length < dotCount) btnNext?.click();
      sendResponse({result: detect});
      break;
    case 'savePics':
      sendResponse({result: downloadAll(pics)});
      break;
  }
});

document.onkeydown = (e) => {
  let evtobj = window.event || e;
  if (evtobj.keyCode == 83 && evtobj.ctrlKey) {
    e.preventDefault();
    chrome.runtime?.sendMessage({action: 'clickIcon'}, function(response) {
      let error = chrome.runtime.lastError;
      if (error) alert(error.message);
    });
  }
};

function downloadAll(pics) {
  try {
    pics.forEach(url => {
      const a = document.createElement("a");
      a.href = url;
      a.target = '_blank';
      a.download = url.split("/").pop();
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    return true;
  } catch(err) {
    return false;
  }
}