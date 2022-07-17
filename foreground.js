const __IED_icon = chrome.runtime.getURL(`/icons/icon24.png`);
const __IED_iconNewTab = chrome.runtime.getURL(`/icons/new_tab.png`);
const __IED_iconSpinner = chrome.runtime.getURL(`/icons/spinner.gif`);

// const __IED_host = window.location.host.split('.').slice(-2).join('.');
const __IED_site = window.location.host.split('.').slice(-2, -1)[0];

var __IED_pics = [];
var __IED_vids = [];
var __IED_selectedPics = [];
var __IED_selectedVids = [];
var __IED_previousHref;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, next, category, type, observeDOM, pics, vids, medias, download } = request;
  console.log("[IED] got action:", action, request);

  let site = __IED_site;
  let feedContainer = document.body;
  let iconURL = chrome.runtime.getURL(`/icons/${site}_download24.png`);

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
        let totalItems = __IED_pics.length + __IED_vids.length;
        let container = checkContainer();
        let isMulti = totalItems > 1;
        let what = `${type}${isMulti ? 's' : ''}`;
        let btn = document.createElement("button");
        btn.innerHTML = `Download ${what}` + (isMulti ? `<span>${totalItems}</span>` : ``);

        let icon = document.createElement("img");
        icon.src = iconURL;
        btn.prepend(icon);

        btn.id = __IED_downloadButtonID;
        btn.classList.add(__IED_buttonClass);
        btn.addEventListener('click', () => __IED_showPopup(iconURL));

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

      __IED_pics = pics;
      __IED_vids = vids;
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

const __IED_buttonClass = '__IED_button';
const __IED_checkboxClass = '__IED_checkbox';
const __IED_newTabClass = '__IED_newTab';
const __IED_captionClass = '__IED_caption';
const __IED_downloadButtonID = '__IED_downloadButton';
const __IED_downloadPopupWrapperID = '__IED_popupWrapper';
const __IED_downloadPopupPicsTitleID = '__IED_popupPhotosTitle';
const __IED_downloadPopupVidsTitleID = '__IED_popupVideosTitle';
const __IED_downloadPopupPicsSelectAllID = '__IED_popupPhotosSelectAll';
const __IED_downloadPopupVidsSelectAllID = '__IED_popupVideosSelectAll';
const __IED_downloadPopupPicsDLID = '__IED_popupPhotosDL';
const __IED_downloadPopupVidsDLID = '__IED_popupVideosDL';
const __IED_downloadPopupPicsNTID = '__IED_popupPhotosNT';
const __IED_downloadPopupVidsNTID = '__IED_popupVideosNT';
const __IED_downloadPopupPicsID = '__IED_popupPhotosContainer';
const __IED_downloadPopupVidsID = '__IED_popupVideosContainer';
const __IED_downloadPopupBodyID = '__IED_popupBody';
const __IED_downloadPopupActionID = '__IED_popupAction';
const __IED_downloadPopupFooterID = '__IED_popupFooter';
const __IED_downloadPopupDownloadID = '__IED_popupDownloadAll';
const __IED_downloadPopupReloadID = '__IED_popupReload';
const __IED_downloadPopupCloseID = '__IED_popupClose';
const __IED_downloadPopupID = '__IED_popup';

const __IED_closePopup = () => __IED_popupWrapper.classList.remove('show');
const __IED_showPopup = (iconURL) => {
  let pics = [...__IED_pics];
  let vids = [...__IED_vids];
  let totalItems = pics.length + vids.length;
  if (totalItems == 1) return __IED_downloadMedias(); // direct download if there are just 1 item
  let btnDownload = document.getElementById(__IED_downloadButtonID);
  btnDownload.classList.add('loading');
  btnDownload.querySelector('img').src = __IED_iconSpinner;
  __IED_selectedPics.length = 0;
  __IED_selectedVids.length = 0;

  let photosCaption = __IED_popupPhotosTitle.closest(`.${__IED_captionClass}`);
  let videosCaption = __IED_popupVideosTitle.closest(`.${__IED_captionClass}`);
  
  if (pics.length) {
    __IED_selectedPics = pics;
    __IED_popupPhotosDL.querySelector('span').innerText = pics.length;
    __IED_popupPhotosTitle.innerHTML = `Pictures <span>${pics.length}</span>`;
    photosCaption.style.display = 'flex';
  } else {
    photosCaption.style.display = 'none';
  }

  if (vids.length) {
    __IED_selectedVids = vids;
    __IED_popupVideosDL.querySelector('span').innerText = vids.length;
    __IED_popupVideosTitle.innerHTML = `Videos <span>${vids.length}</span>`;
    videosCaption.style.display = 'flex';
  } else {
    videosCaption.style.display = 'none';
  }

  __IED_popupDownloadAll.innerHTML = `<img src="${iconURL}"/>Download All<span>${totalItems}</span>`;
  __IED_popupPhotosContainer.innerHTML = '';
  __IED_popupVideosContainer.innerHTML = '';

  let getBaseName = (url) => url.split("/").pop().split('?')[0];
  let createLink = (category, url) => {
    let media;
    if (category == 'photo') {
      media = document.createElement("img");
      media.src = url;
    } else {
      let source = document.createElement("source");
      source.src = url;
      media = document.createElement("video");
      media.appendChild(source);
    }
    let a = document.createElement("a");
    a.href = url;
    a.target = '_blank';
    a.download = getBaseName(url);
    a.className = 'active';
    a.appendChild(media);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      let a = e.currentTarget;
      if (a.classList.contains('active')) {
        a.classList.remove('active');
      } else {
        a.classList.add('active');
      }
      __IED_countSelectedMedia();
    });
    return a;
  };
  pics.forEach((url) => {
    __IED_popupPhotosContainer.appendChild(createLink('photo', url));
  });
  vids.forEach((url) => {
    __IED_popupVideosContainer.appendChild(createLink('video', url));
  });

  setTimeout(() => {
    btnDownload.classList.remove('loading');
    btnDownload.querySelector('img').src = iconURL;
    __IED_popupWrapper.classList.add('show');
  }, 500);
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
      a.href = download && __IED_site != 'twitter' ? url + (url.includes('?') ? '&' : '?') + 'dl=1' : url;
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
  :root {
    --checkbox-color: #49c59f;
    --checkbox-color-disabled: #ddd;
  }
  .${__IED_buttonClass} {
    display: flex;
    align-items: center;
    border: 0;
    border-radius: 2rem;
    padding: 6px 16px;
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
    width: 24px;
    display: inline-block;
    line-height: 24px !important;
    margin-left: 5px !important;
    margin-right: -12px !important;
    margin-top: -2px !important;
    margin-bottom: -2px !important;
  }
  .${__IED_buttonClass}.error {
    filter: blur(2px);
  }
  .${__IED_checkboxClass} {
    -webkit-appearance: none;
    appearance: none;
    background-color: #fff;
    margin: 0;
    font: inherit;
    color: currentColor;
    width: 16px;
    height: 16px;
    border: 2px solid var(--checkbox-color);
    border-radius: 4px;
    display: grid;
    place-content: center;
  }
  .${__IED_checkboxClass}::before {
    content: '';
    width: 10px;
    height: 10px;
    transform: scale(0);
    transition: transform .05s ease-in-out;
    box-shadow: inset 0 10px var(--checkbox-color);
    background-color: CanvasText;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }
  .${__IED_checkboxClass}:checked::before {
    transform: scale(1);
  }
  .${__IED_checkboxClass}:focus {
    outline: 1px solid var(--checkbox-color) !important;
    outline-offset: 0px;
  }
  .${__IED_checkboxClass}:disabled {
    --checkbox-color: var(--checkbox-color-disabled);
    color: var(--checkbox-color-disabled);
    cursor: not-allowed;
  }
  #${__IED_downloadPopupWrapperID} {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,.69);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity .3s ease;
    font: menu;
  }
  #${__IED_downloadPopupID} {
    display: flex;
    flex-direction: column;
    border-radius: 20px;
    padding: 15px;
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
    padding: 8px;
    padding-bottom: 0;
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
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  }
  #${__IED_downloadPopupBodyID} .${__IED_captionClass} h4 span {
    background: rgba(65, 153, 152, .2);
    padding: 2px 9px;
    margin-left: 3px;
    border-radius: 20px;
    color: #1f947c;
  }
  #${__IED_downloadPopupBodyID} .${__IED_captionClass} label {
    display: flex;
    margin: 0 12px;
  }
  #${__IED_downloadPopupBodyID} .${__IED_captionClass} input[type='checkbox'] {
    margin-right: 4px;
  }
  #${__IED_downloadPopupPicsID},
  #${__IED_downloadPopupVidsID} {
    display: block;
    margin-bottom: 8px;
    line-height: 0;
  }
  #${__IED_downloadPopupPicsID} img,
  #${__IED_downloadPopupVidsID} video {
    height: 120px;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all .2s ease-out;
  }
  #${__IED_downloadPopupPicsID} img:hover,
  #${__IED_downloadPopupVidsID} video:hover {
    transform: scale(1.05);
    filter: brightness(1.1) contrast(1) drop-shadow(0 2px 5px rgba(0,0,0,.2));
  }
  #${__IED_downloadPopupBodyID} a {
    position: relative;
    display: inline-block;
    margin-right: 12px;
    margin-bottom: 12px;
  }
  #${__IED_downloadPopupBodyID} a:active {
    opacity: 1;
  }
  #${__IED_downloadPopupBodyID} a::after {
    content: '✔';
    position: absolute;
    top: -2px;
    right: -2px;
    background: #249b6ad9;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    line-height: 0;
    font-size: 12px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    pointer-events: none;
    opacity: 0;
    transform: scale(0.5);
    transition: all .15s ease;
  }
  #${__IED_downloadPopupBodyID} a.active::after {
    opacity: 1;
    transform: scale(1);
  }
  #${__IED_downloadPopupPicsID} a.active img,
  #${__IED_downloadPopupVidsID} a.active video {
    outline: 3px solid #31a97cd1;
    transform: scale(1.02);
  }
  #${__IED_downloadPopupActionID} {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    white-space: nowrap;
    margin-top: 1rem;
    font-size: .7rem;
  }
  #${__IED_downloadPopupFooterID} div {
    display: flex;
    align-items: center;
    font-size: 105%;
    font-weight: 700;
  }
  #${__IED_downloadPopupFooterID} div img {
    width: 20px;
    margin-right: 4px;
  }
  #${__IED_downloadPopupFooterID} a {
    font-weight: 600;
  }
  #${__IED_downloadPopupDownloadID} {
    padding: 8px 18px;
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
    box-shadow: 0 2px 20px -7px rgba(0, 0, 0, .69);
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
  #${__IED_downloadButtonID}.show,
  #${__IED_downloadButtonID}.loading {
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
        <div>
          <h4 id="${__IED_downloadPopupPicsTitleID}"></h4>
          <label>
            <input type="checkbox" id="${__IED_downloadPopupPicsSelectAllID}" class="${__IED_checkboxClass}" checked/>Select all
          </label>
        </div>
        <div>
          <button class="${__IED_buttonClass}" id="${__IED_downloadPopupPicsDLID}">Download All<span></span></button>
          <button class="${__IED_buttonClass} ${__IED_newTabClass}" id="${__IED_downloadPopupPicsNTID}"></button>
        </div>
      </div>
      <div id="${__IED_downloadPopupPicsID}"></div>
      <div class="${__IED_captionClass}">
        <div>
          <h4 id="${__IED_downloadPopupVidsTitleID}"></h4>
          <label>
            <input type="checkbox" id="${__IED_downloadPopupVidsSelectAllID}" class="${__IED_checkboxClass}" checked/>Select all
          </label>
        </div>
        <div>
          <button class="${__IED_buttonClass}" id="${__IED_downloadPopupVidsDLID}">Download All<span></span></button>
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
      <div>
        <img src="${__IED_icon}"/>
        Social Media Easy Download
      </div>
      <span>
        Created by Taufik Nur Rahmanda - <a href="https://www.taufiknur.com/" target="_blank">Visit my Website</a>
      </span>
    </div>
  </div>
  <p id="${__IED_downloadPopupCloseID}">Click anywhere to close</p>
</div>
`);

const __IED_downloadSelectedPics = (download = true) => __IED_downloadMedias(__IED_selectedPics, __IED_popupPhotosDL, download);
const __IED_downloadSelectedVids = (download = true) => __IED_downloadMedias(__IED_selectedVids, __IED_popupVideosDL, download);
const __IED_downloadSelectedMedia = () => __IED_downloadMedias([...__IED_selectedPics, ...__IED_selectedVids], __IED_popupDownloadAll);
const __IED_countSelectedMedia = () => {
  let activePhotos = [...__IED_popupPhotosContainer.querySelectorAll('a.active')];
  let activeVideos = [...__IED_popupVideosContainer.querySelectorAll('a.active')];
  let activePhotosURLs = activePhotos.map((item) => item.href);
  let activeVideosURLs = activeVideos.map((item) => item.href);
  __IED_selectedPics = activePhotosURLs;
  __IED_selectedVids = activeVideosURLs;
  __IED_popupPhotosDL.querySelector('span').innerText = activePhotos.length;
  __IED_popupVideosDL.querySelector('span').innerText = activeVideos.length;
  __IED_popupDownloadAll.querySelector('span').innerText = __IED_selectedPics.length + __IED_selectedVids.length;
  let selectAllPhotos = __IED_selectedPics.length == __IED_pics.length;
  let selectAllVideos = __IED_selectedVids.length == __IED_vids.length;
  __IED_popupPhotosSelectAll.checked = selectAllPhotos;
  __IED_popupVideosSelectAll.checked = selectAllVideos;
  console.log('[IED] selected photos:', __IED_selectedPics.length, '/', __IED_pics.length, selectAllPhotos);
  console.log('[IED] selected videos:', __IED_selectedVids.length, '/', __IED_vids.length, selectAllVideos);
};

const __IED_popupWrapper = document.getElementById(__IED_downloadPopupWrapperID);
const __IED_popupDownloadAll = document.getElementById(__IED_downloadPopupDownloadID);
const __IED_popupPhotosContainer = document.getElementById(__IED_downloadPopupPicsID);
const __IED_popupPhotosTitle = document.getElementById(__IED_downloadPopupPicsTitleID);
const __IED_popupPhotosDL = document.getElementById(__IED_downloadPopupPicsDLID);
const __IED_popupPhotosNT = document.getElementById(__IED_downloadPopupPicsNTID);
const __IED_popupVideosContainer = document.getElementById(__IED_downloadPopupVidsID);
const __IED_popupVideosTitle = document.getElementById(__IED_downloadPopupVidsTitleID);
const __IED_popupVideosDL = document.getElementById(__IED_downloadPopupVidsDLID);
const __IED_popupVideosNT = document.getElementById(__IED_downloadPopupVidsNTID);
const __IED_popupPhotosSelectAll = document.getElementById(__IED_downloadPopupPicsSelectAllID);
const __IED_popupVideosSelectAll = document.getElementById(__IED_downloadPopupVidsSelectAllID);

__IED_popupWrapper.addEventListener('click', __IED_closePopup);
__IED_popupDownloadAll.addEventListener('click', __IED_downloadSelectedMedia);
__IED_popupPhotosDL.addEventListener('click', () => __IED_downloadSelectedPics(true));
__IED_popupPhotosNT.addEventListener('click', () => __IED_downloadSelectedPics(false));
__IED_popupVideosDL.addEventListener('click', () => __IED_downloadSelectedVids(true));
__IED_popupVideosNT.addEventListener('click', () => __IED_downloadSelectedVids(false));

document.getElementById(__IED_downloadPopupID).addEventListener('click', (e) => e.stopPropagation());
document.getElementById(__IED_downloadPopupReloadID).addEventListener('click', () => window.location.reload());
__IED_popupPhotosSelectAll.addEventListener('change', (e) => {
  if (e.currentTarget.checked) {
    __IED_popupPhotosContainer.querySelectorAll('a').forEach((a) => a.classList.add('active'));
  } else {
    __IED_popupPhotosContainer.querySelectorAll('a').forEach((a) => a.classList.remove('active'));
  }
  __IED_countSelectedMedia();
});
__IED_popupVideosSelectAll.addEventListener('change', (e) => {
  if (e.currentTarget.checked) {
    __IED_popupVideosContainer.querySelectorAll('a').forEach((a) => a.classList.add('active'));
  } else {
    __IED_popupVideosContainer.querySelectorAll('a').forEach((a) => a.classList.remove('active'));
  }
  __IED_countSelectedMedia();
});
document.querySelectorAll(`.${__IED_newTabClass}`).forEach((btn) => {
  btn.innerHTML = `<img src="${__IED_iconNewTab}"/>`;
});

window.addEventListener('hashchange', function() {
  console.log("[FED] URL changed hash!", window.location.href, window.location.hash);
});
window.addEventListener('popstate', function(e) {
  console.log("[FED] URL changed pop!", window.location.href, e.state);
});

__IED_injectCSS();
