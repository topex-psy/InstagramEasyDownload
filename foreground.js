chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, next, category, type, iconURL, observeDOM, pics, vids, medias, download } = request;
  console.log("[IED] got action:", action, request);

  // let host = window.location.host.split('.').slice(-2).join('.');
  let site = window.location.host.split('.').slice(-2, -1)[0];
  let feedContainer = document.body;

  switch (action) {
    case 'downloadMedias':
      let downloadResult = __IED_downloadMedias(medias, null, download);
      sendResponse({result: downloadResult});
      break;
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
            case 'photo':
              let mainScreens = document.querySelectorAll('div[role="main"]');
              let mainScreen = mainScreens[mainScreens.length - 1];
              containers = [
                // https://www.facebook.com/photo/?fbid=5208951275826389&set=a.525094930878737
                // document.querySelector('div[aria-label="Photo Viewer"] div[role="main"] img')?.parentElement,

                // https://www.facebook.com/photo/?fbid=5208951275826389&set=a.525094930878737
                // document.querySelector('div[role="main"] img')?.parentElement,
                mainScreen?.querySelector('img')?.parentElement,
              ];
              break;
            case 'video':
              let watchFeeds = document.querySelectorAll("#watch_feed");
              let watchFeed = watchFeeds[watchFeeds.length - 1];
              let posinset = document.querySelector('div[role="article"][aria-posinset] video')?.closest('[aria-posinset]').getAttribute('aria-posinset') || 1;
              containers = [
                // https://www.facebook.com/watch/?ref=saved&v=1005070703497461
                // https://www.facebook.com/watch/?ref=saved&v=434556038532388
                // https://www.facebook.com/watch?v=815373882747287
                // https://www.facebook.com/winterkimenthusiast/videos/563108265457091
                watchFeed?.parentElement.querySelector(`#watch_feed>div>div>div>div>div:first-child`),

                // https://www.facebook.com/nekomarucosplay/posts/pfbid02Y5GYQAGSt9TWcdTovg8ydwT7kV23aB3Paundrokukg45umPyZrLc9ghFWGZLnMPXl
                // https://www.facebook.com/aespadaily/posts/pfbid0CZkRHbg1PjEMPUFwjHJUS373ciXquY51cqokuW6k3uSrYD8YP9ujZN6MfAmiarEVl
                document.querySelector('div[role="article"] a[href*="/photos/"] img')?.closest('a').parentElement.parentElement.parentElement,

                // https://www.facebook.com/permalink.php?story_fbid=997830417807855&id=100027427190759
                // https://www.facebook.com/aespadaily/posts/pfbid033A2Puf6yJoLjWBvaTdRcfukxg2ZHJSGbu37G7iig85oQkqdA4YSSEespds98qQvCl
                document.querySelector(`div[role="article"][aria-posinset="${posinset}"]>div>div>div>div>div>div:nth-child(2)>div>div:nth-child(3)>div:nth-child(2)>div>div>div`),
    
                // https://www.facebook.com/Eirene.Vidiarama/posts/pfbid02ys8EmPpvWrHFDZHHCArEgsKPWNvuGR7eKcZgH1CXCPjQbaoZjJKGdPZPQTSb5g15l
                document.querySelector(`div[role="article"][aria-posinset="${posinset}"]>div>div>div>div>div>div:nth-child(2)>div>div:nth-child(3)>div:nth-child(2)`),

                // https://www.facebook.com/permalink.php?story_fbid=pfbid0uRVc7EMLAuEQNAEppJrLwAxPbboDBmcBf5DLd22JMJunCVT8J2R8bu1bH8Frv6BSl&id=100075339912959
                document.querySelector(`div[role="article"][aria-posinset="${posinset}"]>div>div>div>div>div>div:nth-child(2)>div>div:nth-child(3)`),
    
                // https://www.facebook.com/watch/latest/?badge_type=new_videos_from_followed_page&ref=updates_surface&video_channel_type=new_videos_from_followed_page
                document.querySelector('div[role="main"]>div>div:nth-child(2)>div>div>div>div>div>div:first-child>div:nth-child(2)>div>div>div>div>div:nth-child(2)>div:nth-child(2)'),
    
                // https://www.facebook.com/100001108515739/videos/687024489061568
                document.querySelector('div[role="main"] div[role="presentation"]')?.parentElement,

                // https://www.facebook.com/groups/kelakuankucing/posts/1223693578433648/
                document.querySelector('div[role="main"] video')?.parentElement,
              ];
              break;
            case 'story':
              containers = [
                document.querySelector(`#viewer_dialog > div > div > div > div:nth-child(2) > div > div > div > div`),
                document.querySelector(`#viewer_dialog > div > div > div > div:nth-child(2)`),
                document.querySelector(`#viewer_dialog > div > div > div`),
                document.querySelector(`div[data-pagelet="StoriesContentPane"]`),
              ];
              break;
          }
        } else if (site == 'instagram') {
          containers = [
            document.querySelector('article[role="presentation"] div[role="presentation"]'),
            document.querySelector('article[role="presentation"] > div > div'),
            document.querySelector('article[role="presentation"]')
          ];
        } else {
          containers = [
            document.querySelector('article div[id][aria-labelledby]'),
            document.querySelector('article')
          ];
        }
        for (let i = 0; i < containers.length; i++) {
          if (containers[i]) {
            container = containers[i];
            console.log(`[IED] YEAH! container for ${category} found at index:`, i, container);
            break;
          }
        }
        return container || document.body;
      };
      
      let checkContainer = () => {
        let container = findContainer();
        if (container.tagName.toLowerCase() == 'body') {
          console.log("[IED] container has yet to be found, waiting ...");
        } else {
          console.info("[IED] container found maybe:", container);
        }
        return container;
      };

      let putButton = () => {
        let picCount = pics.length + vids.length;
        let container = checkContainer();
        let isMulti = picCount > 1;
        let what = `${type}${isMulti ? 's' : ''}`;
        let btn = document.createElement("button");
        btn.innerHTML = `Download ${what}` + (isMulti ? `<span>${picCount}</span>` : ``);

        let icon = document.createElement("img");
        icon.src = iconURL;
        btn.prepend(icon);

        btn.id = __IED_downloadButtonID;
        btn.classList.add(__IED_buttonClass);
        btn.addEventListener('click', () => __IED_showPopup(pics, vids, icon.cloneNode(true)));

        try {
          let prevButton = document.getElementById(__IED_downloadButtonID);
          prevButton?.remove();
          let containerPosition = getComputedStyle(container).position;
          if (!['absolute', 'relative'].includes(containerPosition)) {
            container.style.position = 'relative';
          }
          container.appendChild(btn);
          container.addEventListener('mouseenter', () => btn.classList.add('show'));
          container.addEventListener('mouseleave', () => btn.classList.remove('show'));
          feedContainer = container;
          __IED_previousHref = window.location.href;

          if (observeDOM && site == 'facebook') { // only observe facebook for now
            __IED_observeDOM(document.body, function(m) {
              let addedNodes = [];
              let removedNodes = [];
              m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes));
              m.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes));
              let btnDownload = document.getElementById(__IED_downloadButtonID);
              if (window.location.href != __IED_previousHref) {
                console.info('[FED] URL has changed and removed our button, here we go again ...\nAdded:', addedNodes, '\nRemoved:', removedNodes);
                console.info('[FED] URL change: ', __IED_previousHref, '->', window.location.href);
                // TODO reanalyze
              } else if (!btnDownload) {
                console.info('[FED] DOM has changed and removed our button, here we go again ...\nAdded:', addedNodes, '\nRemoved:', removedNodes);
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
    case 'detectMedias':
      let photos = [];
      let videos = [];
      switch (site) {
        case 'facebook':

          // get page source
          let source = new XMLSerializer().serializeToString(document.body);
          console.info("[FED] source OK!", category);
          console.log('[FED] source:', source);
          let fixURL = (url) => url?.replaceAll('&amp;', '&').replaceAll('\\','');
          let strIndexes = (find) => {
            if (!source) return [];
            if (!find) return source.split('').map(function(_, i) { return i; });
            var result = [];
            for (i = 0; i < source.length; ++i) {
              if (source.substring(i, i + find.length) == find) result.push(i);
            }
            return result;
          };
          
          switch (category) {
            case 'story': {
              let starts = `{"data":{"bucket":{`;
              let splitText = source.split(starts);
              if (splitText.length < 2) break;
              let endingKey = `"is_final":`;
              let endingIndex = splitText[0].length + starts.length + splitText[1].indexOf(endingKey) + endingKey.length;
              endingIndex += source[endingIndex] == 't' ? 6 : 7;
              let json = JSON.parse(source.substring(source.indexOf(starts), endingIndex));
              let owner = json.data.bucket.story_bucket_owner.name;
              let { edges } = json.data.bucket.unified_stories;
              for (let h = 0; h < edges.length; h++) {
                let { attachments } = edges[h].node;
                for (let i = 0; i < attachments.length; i++) {
                  let { media } = attachments[i];
                  if (media.playable_url) {
                    let title = media.title?.text || `${owner}'s Video Story`;
                    let data = {
                      id: media.id,
                      height: media.original_height,
                      width: media.original_width,
                      url: media.permalink_url,
                      hd: fixURL(media.playable_url_quality_hd),
                      sd: fixURL(media.playable_url),
                      thumbnail: fixURL(media.preferred_thumbnail?.image.uri),
                      title: `${title} ${new Date().toISOString().substring(0, 10)}`,
                    };
                    console.log("[IED] GOT A VIDEO STORY", media, JSON.stringify(data, null, 2));
                    videos.push(data);
                  } else {
                    let data = {
                      id: media.id,
                      height: media.image.height,
                      width: media.image.width,
                      hd: fixURL(media.image.uri),
                      sd: fixURL(media.previewImage.uri),
                      thumbnail: fixURL(media.previewImage.uri),
                      title: `${owner}'s Photo Story ${new Date().toISOString().substring(0, 10)}`,
                    };
                    console.log("[IED] GOT A PHOTO STORY", media, JSON.stringify(data, null, 2));
                    photos.push(data);
                  }
                }
              }
            }
            break;
            default: {
              let titlePrefix = `"color_ranges":[],"text":"`;
              let title = source.substring(source.indexOf(titlePrefix) + titlePrefix.length).split('"')[0];
              console.info("[FED] media title:", title);
              let findIndexes = [
                ...strIndexes('"playable_url":'),
                ...strIndexes('"viewer_image":'),
                ...strIndexes('"image":'),
              ];
              if (!findIndexes.length) {
                console.log("[FED] can't find any media url!");
                break;
              }
              for (let h = 0; h < findIndexes.length; h++) {
                let findFrom = findIndexes[h];
                let findStart = '';
                let findStartIndex = findFrom;
                let findEnd = '';
                let findEndIndex = findFrom;
                let findStartRemaining = 1;
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
                let mediaSource = source.substring(findStartIndex, findEndIndex + 1);
                // console.log('[FED] media source:', mediaSource);
                let media;
                try {
                  media = JSON.parse(mediaSource);
                  // console.log('[FED] parsed json', media);
                } catch(e) {
                  // console.log('[FED] full source', source);
                  console.error('[FED] json malformatted', e);
                  break;
                }
                if (media.playable_url) {
                  if (media.animated_image) continue; // exclude stickers
                  if (videos.find((vid) => vid.id && vid.id == media.id)) continue;
                  let data = {
                    id: media.id,
                    height: media.original_height,
                    width: media.original_width,
                    url: media.permalink_url,
                    duration: media.playable_duration_in_ms,
                    sd: fixURL(media.playable_url),
                    hd: fixURL(media.playable_url_quality_hd),
                    thumbnail: fixURL(media.preferred_thumbnail?.image.uri),
                    thumbnail2: fixURL(media.thumbnailImage?.uri),
                    title,
                  };
                  console.log("[IED] GOT A VIDEO MEDIA", media, JSON.stringify(data, null, 2));
                  videos.push(data);
                } else if (!window.location.href.includes('/watch/')) {
                // } else if (window.location.href.includes('/posts/')) {
                  if (media.__typename == 'Sticker' || media.animated_image || media.massive_image) continue; // exclude stickers
                  if (photos.find((pic) => pic.id && pic.id == media.id)) continue; // already exists
                  let owner = document.title.split(' - ')[0];
                  let possibleImages = [media.viewer_image, media.photo_image, media.image];
                  console.log("[IED] possibleImages", possibleImages);
                  let findLargest = possibleImages.filter((pic) => pic?.uri).sort((a,b) => a.width > b.width ? -1 : a.width < b.width ? 1 : 0);
                  console.log("[IED] findLargest", findLargest);
                  if (!findLargest.length) continue;
                  let largest = findLargest[0];
                  let medium = findLargest.length > 1 ? findLargest[1] : largest;
                  let data = {
                    id: media.id,
                    width: largest.width,
                    height: largest.height,
                    url: media.url,
                    hd: fixURL(largest.uri),
                    sd: fixURL(medium.uri),
                    thumbnail: fixURL(medium.uri),
                    title: `${owner}'s Photo`,
                  };
                  console.log("[IED] GOT A PHOTO MEDIA", media, JSON.stringify(data, null, 2));
                  photos.push(data);
                }
              }
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
    __IED_closePopup();
    chrome.runtime?.sendMessage({action: 'escapeKey', url: window.location.href}, function(response) {
      let error = chrome.runtime.lastError;
      if (error) return console.log('[IED] escapeKey error', error.message);
      console.log('[IED] escapeKey response', response);
    });
  }
};

var __IED_previousHref;
const __IED_buttonClass = '__IED_button';
const __IED_newTabClass = '__IED_newTab';
const __IED_captionClass = '__IED_caption';
const __IED_downloadButtonID = '__IED_downloadButton';
const __IED_downloadPopupWrapperID = '__IED_downloadPopupWrapper';
const __IED_downloadPopupPicsTitleID = '__IED_downloadPopupPicsTitle';
const __IED_downloadPopupVidsTitleID = '__IED_downloadPopupVidsTitle';
const __IED_downloadPopupPicsDLID = '__IED_downloadPopupPicsDL';
const __IED_downloadPopupVidsDLID = '__IED_downloadPopupVidsDL';
const __IED_downloadPopupPicsNTID = '__IED_downloadPopupPicsNT';
const __IED_downloadPopupVidsNTID = '__IED_downloadPopupVidsNT';
const __IED_downloadPopupPicsID = '__IED_downloadPopupPics';
const __IED_downloadPopupVidsID = '__IED_downloadPopupVids';
const __IED_downloadPopupBodyID = '__IED_downloadPopupBody';
const __IED_downloadPopupActionID = '__IED_downloadPopupAction';
const __IED_downloadPopupFooterID = '__IED_downloadPopupFooter';
const __IED_downloadPopupDownloadID = '__IED_downloadPopupDownload';
const __IED_downloadPopupReloadID = '__IED_downloadPopupReload';
const __IED_downloadPopupCloseID = '__IED_downloadPopupClose';
const __IED_downloadPopupID = '__IED_downloadPopup';

const __IED_closePopup = () => __IED_downloadPopupWrapper.classList.remove('show');
const __IED_showPopup = (pics, vids, icon) => {
  let totalItems = pics.length + vids.length;
  if (totalItems == 1) return __IED_downloadMedias(); // direct download if there are just 1 item
  __IED_downloadPopupWrapper.classList.add('show');
  let picsTitle = document.getElementById(__IED_downloadPopupPicsTitleID);
  let picsDL = document.getElementById(__IED_downloadPopupPicsDLID);
  let picsNT = document.getElementById(__IED_downloadPopupPicsNTID);
  if (pics.length) {
    picsDL.addEventListener('click', () => __IED_downloadMedias(pics, picsDL, true));
    picsNT.addEventListener('click', () => __IED_downloadMedias(pics, picsNT, false));
    picsTitle.innerText = `Pictures (${pics.length})`;
    picsTitle.parentElement.style.display = 'flex';
  } else {
    picsTitle.parentElement.style.display = 'none';
  }
  let vidsTitle = document.getElementById(__IED_downloadPopupVidsTitleID);
  let vidsDL = document.getElementById(__IED_downloadPopupVidsDLID);
  let vidsNT = document.getElementById(__IED_downloadPopupVidsNTID);
  if (vids.length) {
    vidsTitle.innerText = `Videos (${vids.length})`;
    vidsDL.addEventListener('click', () => __IED_downloadMedias(vids, vidsDL, true));
    vidsNT.addEventListener('click', () => __IED_downloadMedias(vids, vidsNT, false));
    vidsTitle.parentElement.style.display = 'flex';
  } else {
    vidsTitle.parentElement.style.display = 'none';
  }
  let picsContainer = document.getElementById(__IED_downloadPopupPicsID);
  let vidsContainer = document.getElementById(__IED_downloadPopupVidsID);
  let btnDownload = document.getElementById(__IED_downloadPopupDownloadID);
  btnDownload.innerHTML = `Download All<span>${totalItems}</span>`;
  btnDownload.prepend(icon);
  picsContainer.innerHTML = '';
  vidsContainer.innerHTML = '';
  let getBaseName = (url) => url.split("/").pop().split('?')[0];
  pics.forEach((url) => {
    let a = document.createElement("a");
    let img = document.createElement("img");
    img.src = url;
    a.href = url;
    a.target = '_blank';
    a.download = getBaseName(url);
    a.appendChild(img);
    picsContainer.appendChild(a);
  });
  vids.forEach((url) => {
    let a = document.createElement("a");
    let source = document.createElement("source");
    let video = document.createElement("video");
    source.src = url;
    a.href = url;
    a.target = '_blank';
    a.download = getBaseName(url);
    video.appendChild(source);
    a.appendChild(video);
    vidsContainer.appendChild(a);
  });
}
const __IED_downloadMedias = (medias, btn, download = true) => {
  btn = btn || document.getElementById(__IED_downloadButtonID);
  if (!medias) {
    chrome.runtime?.sendMessage({action: 'clickIcon', download}, function(response) {
      let error = chrome.runtime.lastError;
      if (error) {
        console.log('[IED] clickIcon error', error.message);
        __IED_buttonError(btn);
        return false;
      }
      console.log('[IED] clickIcon response', response);
    });
    return true;
  }
  try {
    medias.forEach(url => {
      const a = document.createElement("a");
      // a.href = url;
      a.href = download ? url + (url.includes('?') ? '&' : '?') + 'dl=1' : url;
      // if (!download) a.target = '_blank';
      a.target = '_blank';
      if (download) a.download = url.split("/").pop().split('?')[0];
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    return true;
  } catch(err) {
    console.error('[IED] download media error:', err);
    __IED_buttonError(btn);
    return false;
  }
}
const __IED_buttonError = (btn) => {
  if (!btn) return;
  btn.classList.add('error');
  setTimeout(() => { btn.classList.remove('error'); }, 200);
};
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
  .${__IED_buttonClass} {
    display: flex;
    align-items: center;
    border: 0;
    border-radius: 2rem;
    padding: 0.4rem 1rem;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(45deg, #42a661, #4bc3fd);
    box-shadow: 2px 2px 6px -4px #000;
    cursor: pointer;
    outline: none;
  }
  .${__IED_buttonClass}:hover {
    filter: brightness(1.1);
  }
  .${__IED_buttonClass}:active {
    filter: brightness(.95);
    transform: scale(.95);
  }
  .${__IED_buttonClass} img {
    margin-right: 0.5rem !important;
    width: 16px;
  }
  .${__IED_buttonClass} span {
    background: #00000045;
    border-radius: 50%;
    width: 1.5rem;
    display: inline-block;
    line-height: 1.5rem !important;
    margin-left: 0.4rem !important;
    margin-right: -0.5rem !important;
  }
  .${__IED_buttonClass}.error {
    filter: blur(2px);
  }
  #${__IED_downloadPopupWrapperID} {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,.5);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity .3s ease;
  }
  #${__IED_downloadPopupID} {
    display: flex;
    flex-direction: column;
    border-radius: 1rem;
    padding: 1rem;
    max-width: 700px;
    max-height: calc(100vh - 8rem);
    background: linear-gradient(45deg, #ffffff, #d4fff7db);
    box-shadow: 0 2px 10px -7px rgba(0, 0, 0, 0);
    transform: scale(.8);
    transition: all .5s ease;
  }
  #${__IED_downloadPopupBodyID} {
    overflow-y: auto;
    flex-grow: 1;
    flex-shrink: 1;
    padding: 0.5rem;
  }
  #${__IED_downloadPopupBodyID} button {
    filter: hue-rotate(315deg);
  }
  #${__IED_downloadPopupBodyID} button.${__IED_newTabClass} {
    filter: hue-rotate(77deg);
    margin-left: 0.45rem;
  }
  #${__IED_downloadPopupBodyID} button.${__IED_newTabClass} img {
    margin-right: 0 !important;
    width: 16px;
  }
  #${__IED_downloadPopupBodyID} .${__IED_captionClass} {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;
    white-space: nowrap;
  }
  #${__IED_downloadPopupBodyID} .${__IED_captionClass} div {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  #${__IED_downloadPopupBodyID} .${__IED_captionClass} h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 1rem 0 0;
  }
  #${__IED_downloadPopupPicsID},
  #${__IED_downloadPopupVidsID} {
    display: block;
    margin-bottom: 1rem;
    line-height: 0;
  }
  #${__IED_downloadPopupPicsID} img,
  #${__IED_downloadPopupVidsID} video {
    height: 7rem;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all .5s ease-out;
  }
  #${__IED_downloadPopupPicsID} img:hover,
  #${__IED_downloadPopupVidsID} video:hover {
    transform: scale(1.05);
    filter: brightness(1.1) contrast(1) drop-shadow(0 2px 5px rgba(0,0,0,.2));
  }
  #${__IED_downloadPopupActionID} {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 1rem;
  }
  #${__IED_downloadPopupActionID} > div {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  #${__IED_downloadPopupActionID} > div > button {
    margin: 0 .35rem;
  }
  #${__IED_downloadPopupFooterID} {
    display: block;
    margin-top: 1rem;
    text-align: end;
    font-size: .7rem;
  }
  #${__IED_downloadPopupFooterID} a {
    font-weight: 600;
  }
  #${__IED_downloadPopupReloadID} {
    filter: hue-rotate(45deg);
  }
  #${__IED_downloadPopupCloseID} {
    color: #fff;
    font-size: 13px;
    position: absolute;
    text-align: center;
    bottom: 0;
    margin: 0 0 1rem 0;
    pointer-events: none;
  }
  #${__IED_downloadPopupWrapperID}.show {
    pointer-events: auto;
    opacity: 1;
  }
  #${__IED_downloadPopupWrapperID}.show #${__IED_downloadPopupID} {
    box-shadow: 0 2px 20px -7px rgba(0, 0, 0, .5);
    transform: scale(1);
  }
  #${__IED_downloadButtonID} {
    position: absolute;
    top: .75rem;
    right: .75rem;
    z-index: 999;
    opacity: 0;
    transform: translateY(-1rem);
    transition: all .2s ease;
  }
  #${__IED_downloadButtonID}.show {
    transform: translateY(0);
    opacity: 1;
  }`;
  document.head.appendChild(css);
}

document.body.insertAdjacentHTML('beforeend', `
<div id="${__IED_downloadPopupWrapperID}">
  <div id="${__IED_downloadPopupID}">
    <div id="${__IED_downloadPopupBodyID}">
      <div class="${__IED_captionClass}">
        <h4 id="${__IED_downloadPopupPicsTitleID}"></h4>
        <div>
          <button class="${__IED_buttonClass}" id="${__IED_downloadPopupPicsDLID}">Download All</button>
          <button class="${__IED_buttonClass} ${__IED_newTabClass}" id="${__IED_downloadPopupPicsNTID}"></button>
        </div>
      </div>
      <div id="${__IED_downloadPopupPicsID}"></div>
      <div class="${__IED_captionClass}">
        <h4 id="${__IED_downloadPopupVidsTitleID}"></h4>
        <div>
          <button class="${__IED_buttonClass}" id="${__IED_downloadPopupVidsDLID}">Download All</button>
          <button class="${__IED_buttonClass} ${__IED_newTabClass}" id="${__IED_downloadPopupVidsNTID}"></button>
        </div>
      </div>
      <div id="${__IED_downloadPopupVidsID}"></div>
    </div>
    <div id="${__IED_downloadPopupActionID}">
      <div>
        Displayed wrong items?
        <button class="${__IED_buttonClass}" id="${__IED_downloadPopupReloadID}">Reload Page</button>
      </div>
      <div>
        <button class="${__IED_buttonClass}" id="${__IED_downloadPopupDownloadID}"></button>
      </div>
    </div>
    <div id="${__IED_downloadPopupFooterID}">
      Copyright &copy;2022 Taufik Nur Rahmanda - <a href="https://www.taufiknur.com/" target="_blank">Visit my Website</a>
    </div>
  </div>
  <p id="${__IED_downloadPopupCloseID}">Click anywhere to close</p>
</div>
`);

const __IED_downloadPopupWrapper = document.getElementById(__IED_downloadPopupWrapperID);
const __IED_downloadPopupDownload = document.getElementById(__IED_downloadPopupDownloadID);
const __IED_newTabIcon = chrome.runtime.getURL(`/icons/new_tab.png`);

__IED_downloadPopupWrapper.addEventListener('click', __IED_closePopup);
__IED_downloadPopupDownload.addEventListener('click', () => __IED_downloadMedias(null, __IED_downloadPopupDownload));
document.getElementById(__IED_downloadPopupReloadID).addEventListener('click', () => window.location.reload());
document.getElementById(__IED_downloadPopupID).addEventListener('click', (e) => e.stopPropagation());
document.querySelectorAll(`.${__IED_newTabClass}`).forEach((btn) => {
  btn.innerHTML = `<img src="${__IED_newTabIcon}"/>`;
});

window.addEventListener('hashchange', function() {
  console.log("[FED] URL changed hash!", window.location.href, window.location.hash);
});
window.addEventListener('popstate', function(e) {
  console.log("[FED] URL changed pop!", window.location.href, e.state);
});

__IED_injectCSS();
