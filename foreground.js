const __IED_downloadButtonID = '__IED_downloadButton';
const __IED_clickIcon = () => {
  chrome.runtime?.sendMessage({action: 'clickIcon', url: window.location.href}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.warn('[IED] clickIcon error', error.message);
    console.log('[IED] clickIcon response', response);
    if (!response.ok) {
      // TODO please click again
    }
  });
}
const __IED_injectCSS = () => {
  var css = document.createElement("style");
  css.innerHTML = `
  #${__IED_downloadButtonID} {
    display: flex;
    align-items: center;
    position: absolute;
    top: .75rem;
    right: .75rem;
    border: 0;
    border-radius: 2rem;
    padding: 0.45rem 1rem;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(45deg, #42a661, #4bc3fd);
    box-shadow: 2px 2px 6px -4px #000;
    cursor: pointer;
    opacity: 0;
    transform: translateY(-1rem);
    transition: all .2s ease;
  }
  #${__IED_downloadButtonID}.show {
    transform: translateY(0);
    opacity: 1;
  }
  #${__IED_downloadButtonID} img {
    margin-right: 0.5rem;
  }
  #${__IED_downloadButtonID} span {
    background: #00000045;
    border-radius: 50%;
    width: 1.5rem;
    display: inline-block;
    line-height: 1.5rem;
    margin-left: 0.4rem;
    margin-right: -0.5rem;
  }
  #${__IED_downloadButtonID}:hover {
    filter: brightness(1.1);
  }
  #${__IED_downloadButtonID}:active {
    filter: brightness(.95);
    transform: scale(.95);
  }`;
  document.head.appendChild(css);
}
__IED_injectCSS();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, next, type, picCount, iconURL } = request;
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
      let btn = document.createElement("button");
      let what = `${type}${picCount > 1 ? 's' : ''}`;
      btn.innerHTML = `Download ${what}<span>${picCount}</span>`;
      let icon = document.createElement("img");
      icon.src = iconURL;
      btn.prepend(icon);
      btn.id = __IED_downloadButtonID;
      btn.addEventListener('click', __IED_clickIcon);
      setTimeout(() => { // waiting for container element
        let container = document.body;
        if (window.location.host.endsWith('instagram.com')) {
          container = type == 'photo'
          ? document.querySelector('article[role="presentation"] div[role="presentation"]') ||
            document.querySelector('article[role="presentation"]') ||
            document.body
          : document.querySelector('article[role="presentation"] > div > div') ||
            document.querySelector('article[role="presentation"]') ||
            document.body;
        } else {
          container = document.querySelector('article div[id][aria-labelledby]') ||
            document.querySelector('article') ||
            document.body;
        }

        let prevButton = document.getElementById(__IED_downloadButtonID);
        prevButton?.remove();
        container.appendChild(btn);
        container.addEventListener('mouseenter', () => btn.classList.add('show'));
        container.addEventListener('mouseleave', () => btn.classList.remove('show'));
      }, 1000);
      sendResponse({result: 'ok'});
      break;
    case 'detectPics':
      let photos = [];
      let videos = [];
      if (window.location.host.endsWith('twitter.com')) {
        let thumbnails = document.querySelectorAll('article a[href*="/photo/"]');
        let total = thumbnails.length;
        thumbnails.forEach((a) => {
          let thumbSrc = a.querySelector('img')?.src;
          if (thumbSrc) {
            let thumbSize = thumbSrc.split('name=').pop().split('&')[0];
            photos.push(thumbSrc.replace(`name=${thumbSize}`,'name=large'));
          }
        });
        document.querySelectorAll('article video').forEach((v) => {
          videos.push(v.poster);
        });
        console.log("[IED] got photos:", photos);
        console.log("[IED] got videos:", videos);
        sendResponse({result: photos, videos, total});
        break;
      }
      let images = document.querySelectorAll('article[role="presentation"] div[role="presentation"] img[src]');
      if (!images.length) images = document.querySelectorAll('article[role="presentation"] img[srcset][src]');
      if (!images.length) images = [document.querySelector('article[role="presentation"] img[src]')];

      // TODO mengandung foto & video: https://www.instagram.com/p/Cf_w5v7JMP2/
      images.forEach(img => {
        // if (img.hasAttribute('srcset')) {
        //   let srcset = img.getAttribute('srcset');
        //   let src = srcset.split(' ')[0];
        //   photos.push(src);
        // } else {
          if (!!img && !img.src.includes('_s150x150')) {
            console.log("[IED] push pic url:", img.src, img.src.includes('.mp4'));
            photos.push(img.src); // exclude ?stp=dst-jpg_s150x150
          }
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