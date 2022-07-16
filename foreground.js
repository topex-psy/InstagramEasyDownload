chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, next, category, type, picCount, iconURL, observeDOM, reanalyze } = request;
  console.log("[IED] got action:", action, request);

  // let host = window.location.host.split('.').slice(-2).join('.');
  let site = window.location.host.split('.').slice(-2, -1)[0];
  let feedContainer = document.body;

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
      let findContainer = () => {
        console.log("[IED] looking for container for download button:", category);
        let containers = [];
        let container;
        if (site == 'facebook') {
          switch (category) {
            case 'video':
              let watchFeeds = document.querySelectorAll("#watch_feed");
              let watchFeed = watchFeeds[watchFeeds.length - 1];
              let posinset = document.querySelector('div[role="article"][aria-posinset] video')?.closest('[aria-posinset]').getAttribute('aria-posinset') || 1;
              containers = [
                // https://www.facebook.com/watch/?ref=saved&v=1005070703497461
                // https://www.facebook.com/watch/?ref=saved&v=434556038532388
                // https://www.facebook.com/watch?v=815373882747287
                watchFeed?.parentElement.querySelector("#watch_feed>div>div>div>div>div:first-child"),
    
                // https://www.facebook.com/permalink.php?story_fbid=997830417807855&id=100027427190759
                document.querySelector(`div[role="article"][aria-posinset="${posinset}"]>div>div>div>div>div>div:nth-child(2)>div>div:nth-child(3)>div:nth-child(2)>div>div>div`),
    
                // https://www.facebook.com/groups/kelakuankucing/posts/1223693578433648/
                // https://www.facebook.com/permalink.php?story_fbid=pfbid0uRVc7EMLAuEQNAEppJrLwAxPbboDBmcBf5DLd22JMJunCVT8J2R8bu1bH8Frv6BSl&id=100075339912959
                document.querySelector(`div[role="article"][aria-posinset="${posinset}"]>div>div>div>div>div>div:nth-child(2)>div>div:nth-child(3)`),
    
                // https://www.facebook.com/watch/latest/?badge_type=new_videos_from_followed_page&ref=updates_surface&video_channel_type=new_videos_from_followed_page
                document.querySelector('div[role="main"]>div>div:nth-child(2)>div>div>div>div>div>div:first-child>div:nth-child(2)>div>div>div>div>div:nth-child(2)>div:nth-child(2)'),
    
                // https://www.facebook.com/100001108515739/videos/687024489061568
                document.querySelector('div[role="main"]'),
              ];
              break;
            case 'story':
              let viewerDialog = document.querySelector("#viewer_dialog");
              containers = [
                viewerDialog?.querySelector("div > div > div > div:nth-child(2) > div > div > div > div > div > div:nth-child(2) > div") ||
                viewerDialog?.querySelector("div > div > div > div:nth-child(2) > div > div > div > div") ||
                viewerDialog?.querySelector('div>div>div') ||
                document.querySelector('div[data-pagelet="StoriesContentPane"]'),
              ];
              break;
          }
          for (let i = 0; i < containers.length; i++) {
            if (containers[i]) {
              container = containers[i];
              console.log("[IED] YEAH! container found at index:", i, container);
              break;
            }
          }
        } else if (site == 'instagram') {
          container = category == 'photo'
          ? document.querySelector('article[role="presentation"] div[role="presentation"]') ||
            document.querySelector('article[role="presentation"]')
          : document.querySelector('article[role="presentation"] > div > div') ||
            document.querySelector('article[role="presentation"]');
        } else {
          container = document.querySelector('article div[id][aria-labelledby]') ||
            document.querySelector('article');
        }
        return container || document.body;
      };
      
      let checkContainer = () => {
        let container = findContainer();
        if (container.tagName.toLowerCase() == 'body') {
          console.log("[IED] container has yet to be found, waiting ...");
        } else {
          console.info("[IED] container found maybe:", container);

          // TODO check maybe it's a multiple photos post
          // https://www.facebook.com/aespadaily/posts/pfbid0CZkRHbg1PjEMPUFwjHJUS373ciXquY51cqokuW6k3uSrYD8YP9ujZN6MfAmiarEVl
          let checkPhotos = container.querySelectorAll('a[href*="/photos/"]');
          console.log("[IED] maybe it's a multiple photos post", i, checkPhotos);
          if (!reanalyze && checkPhotos.length) {
            chrome.runtime?.sendMessage({action: 'reanalyze', url: window.location.href}, function(response) {
              let error = chrome.runtime.lastError;
              if (error) return console.log('[IED] reanalyze error', error.message);
              console.log('[IED] reanalyze response', response);
            });
          }

        }
        return container;
      };

      let putButton = () => {
        let container = checkContainer();
        let isMulti = picCount > 1;
        let what = `${type}${isMulti ? 's' : ''}`;
        let btn = document.createElement("button");
        btn.innerHTML = `Download ${what}` + (isMulti ? `<span>${picCount}</span>` : ``);

        let icon = document.createElement("img");
        icon.src = iconURL;
        btn.prepend(icon);

        btn.id = __IED_downloadButtonID;
        btn.addEventListener('click', __IED_clickIcon);

        try {
          let prevButton = document.getElementById(__IED_downloadButtonID);
          prevButton?.remove();
          container.style.position = 'relative';
          container.appendChild(btn);
          container.addEventListener('mouseenter', () => btn.classList.add('show'));
          container.addEventListener('mouseleave', () => btn.classList.remove('show'));
          feedContainer = container;

          if (observeDOM && site == 'facebook') { // only observe facebook for now
            __IED_observeDOM(document.body, function(m) {
              let addedNodes = [];
              let removedNodes = [];
              m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes));
              m.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes));
              let btnDownload = document.getElementById(__IED_downloadButtonID);
              if (!btnDownload) {
                console.info('[FED] dom has changed and removed our button, here we go again ...\nAdded:', addedNodes, '\nRemoved:', removedNodes);
                putButton();
              }
            });
            isObserved = true;
          }

        } catch(e) {
          console.warn("[IED] no, no... cannot put button here:", e);
        }
      };

      let isObserved = false;
      putButton();

      sendResponse({
        result: 'ok',
        container: feedContainer?.tagName.toLowerCase(),
        isObserved,
      });
      break;
    case 'detectPics':
      let photos = [];
      let videos = [];
      switch (site) {
        case 'facebook':

          // get page source
          let source = new XMLSerializer().serializeToString(document.body);
          console.info("[FED] source OK!", category);
          let fixURL = (url) => url?.replaceAll('&amp;', '&');
          let strIndexes = (source, find) => {
            if (!source) return [];
            if (!find) return source.split('').map(function(_, i) { return i; });
            var result = [];
            for (i = 0; i < source.length; ++i) {
              if (source.substring(i, i + find.length) == find) result.push(i);
            }
            return result;
          }

          // detect multiple photos
          var checkPhotos = document.body.querySelectorAll('a[href*="/photos/"] img[src]');
          console.log("[IED] checkPhotos ...", checkPhotos);
          for (let i = 0; i < checkPhotos.length; i++) {
            let src = checkPhotos[i].src;
            let name = src.split('?')[0].split('/').pop();
            console.log("\n[IED] LOL, we find photo", i, name, src);
            photos.push({
              // id: media.id,
              // height: media.image.height,
              // width: media.image.width,
              hd: fixURL(src),
              sd: fixURL(src),
              // thumbnail: fixURL(media.previewImage.uri),
              // title: `${owner}'s Photo Story ${new Date().toISOString().substring(0, 10)}`,
            });
          }
          
          switch (category) {
            case 'story': {
              let starts = `{"data":{"bucket":{`;
              let splitText = source.split(starts);
              if (splitText.length < 2) break;
              let endingKey = `"is_final":`;
              let endingIndex = splitText[0].length + starts.length + splitText[1].indexOf(endingKey) + endingKey.length;
              endingIndex += source[endingIndex] == 't' ? 6 : 7;
              let text = source.substring(source.indexOf(starts), endingIndex);
              let json = JSON.parse(text);
              let owner = json.data.bucket.story_bucket_owner.name;
              let { edges } = json.data.bucket.unified_stories;
              for (let h = 0; h < edges.length; h++) {
                let { attachments } = edges[h].node;
                for (let i = 0; i < attachments.length; i++) {
                  let { media } = attachments[i];
                  console.log('[FED] found media', media);
                  if (media.playable_url) { // story video
                    videos.push({
                      id: media.id,
                      height: media.original_height,
                      width: media.original_width,
                      url: media.permalink_url,
                      hd: fixURL(media.playable_url_quality_hd),
                      sd: fixURL(media.playable_url),
                      thumbnail: fixURL(media.preferred_thumbnail?.image.uri),
                      title: `${owner}'s Video Story ${new Date().toISOString().substring(0, 10)}`,
                    });
                  } else { // story photo
                    photos.push({
                      id: media.id,
                      height: media.image.height,
                      width: media.image.width,
                      hd: fixURL(media.image.uri),
                      sd: fixURL(media.previewImage.uri),
                      thumbnail: fixURL(media.previewImage.uri),
                      title: `${owner}'s Photo Story ${new Date().toISOString().substring(0, 10)}`,
                    });
                  }
                }
              }
            }
            break;
            default: {
              let titlePrefix = `"color_ranges":[],"text":"`;
              let title = source.substring(source.indexOf(titlePrefix) + titlePrefix.length).split('"')[0];
              let findIndexes = strIndexes(source, '"playable_url":');
              // console.info("[FED] findIndexes", findIndexes);
              if (!findIndexes.length) {
                console.log("[FED] not finding any playable_url!");
                break;
              }
              // for (let h = 0; h < findIndexes.length; h++) {
              //   let findFrom = findIndexes[h];
                let findFrom = findIndexes[0];
                let findStart = '';
                let findStartIndex = findFrom;
                let findEnd = '';
                let findEndIndex = findFrom;
                let findStartRemaining = 1;
                // TODO infinite loop: https://www.facebook.com/TopEx.Divine/posts/pfbid037omp11fCY8nS1Sp6izxRemKi5RHSMXpfqQCrLAijRdGwcvRF2cjX8NDmR18mfMsJl?notif_id=1657931896809022&notif_t=feedback_reaction_generic&ref=notif
                while (findStart != '{' || findStartRemaining > 0) {
                  findStartIndex--;
                  findStart = source[findStartIndex];
                  if (findStart == '}') findStartRemaining++;
                  else if (findStart == '{') findStartRemaining--;
                }
                let findEndRemaining = 1;
                while (findEnd != '}' || findEndRemaining > 0) {
                  findEndIndex++;
                  findEnd = source[findEndIndex];
                  if (findEnd == '{') findEndRemaining++;
                  else if (findEnd == '}') findEndRemaining--;
                }
                let text = source.substring(findStartIndex, findEndIndex + 1);
                console.log('[FED] getPageSource video SUCCESS!');
                console.log('[FED] getPageSource video title:', title);
                console.log('[FED] getPageSource source:', source);
                // console.log('[FED] getPageSource text:', text);
                let media;
                try {
                  media = JSON.parse(text);
                  // console.log('[FED] parsed json', media);
                } catch(e) {
                  // console.log('[FED] full source', source);
                  console.error('[FED] json malformatted', e);
                  break;
                }
                console.log('[FED] getPageSource video hd:', fixURL(media.playable_url_quality_hd));
                videos.push({
                  id: media.id,
                  height: media.original_height,
                  width: media.original_width,
                  url: media.permalink_url,
                  duration: media.playable_duration_in_ms,
                  sd: fixURL(media.playable_url),
                  hd: fixURL(media.playable_url_quality_hd),
                  thumbnail: fixURL(media.preferred_thumbnail?.image.uri),
                  title,
                });
              // }
            }
          }
          sendResponse({photos, videos});
          break;
        case 'twitter':
          let thumbnails = document.querySelectorAll('article a[href*="/photo/"]');
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
          sendResponse({photos, videos, total: thumbnails.length});
          break;
        case 'instagram':
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
              if (!!img && !img.src.includes('_s150x150')) { // abaikan foto profil
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
            photos,
            total: dotCount ? dotCount : 1,
            canContinue: !!btnToPress,
          });
          break;
      }
      break;
  }
});

document.onkeydown = (e) => {
  if (e.key === "Escape") {
    // e.preventDefault();
    chrome.runtime?.sendMessage({action: 'escapeKey', url: window.location.href}, function(response) {
      let error = chrome.runtime.lastError;
      if (error) return console.log('[IED] escapeKey error', error.message);
      console.log('[IED] escapeKey response', response);
    });
  }
};

const __IED_downloadButtonID = '__IED_downloadButton';
const __IED_clickIcon = () => {
  chrome.runtime?.sendMessage({action: 'clickIcon', url: window.location.href}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.warn('[IED] clickIcon error', error.message);
    console.log('[IED] clickIcon response', response);
    if (!response.ok) {
      let btnDownload = document.getElementById(__IED_downloadButtonID);
      btnDownload.classList.add('error');
      setTimeout(() => {
        btnDownload.classList.remove('error');
      }, 200);
    }
  });
}
const __IED_observeDOM = (function() {
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
  return function(obj, callback) {
    if (!obj || obj.nodeType !== 1) return; 
    if (MutationObserver) {
      var mutationObserver = new MutationObserver(callback)
      mutationObserver.observe( obj, { childList:true, subtree:true })
      return mutationObserver
    } else if (window.addEventListener) {
      obj.addEventListener('DOMNodeInserted', callback, false)
      obj.addEventListener('DOMNodeRemoved', callback, false)
    }
  }
})()
const __IED_injectCSS = () => {
  var css = document.createElement("style");
  css.innerHTML = `
  #${__IED_downloadButtonID} {
    display: flex;
    align-items: center;
    position: absolute;
    top: .75rem;
    right: .75rem;
    z-index: 999;
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
  #${__IED_downloadButtonID}.error {
    filter: blur(2px);
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