const __IED_site = window.location.host.split('.').slice(-2, -1)[0];
const __IED_icon = chrome.runtime.getURL(`/icons/icon24.png`);
const __IED_iconNewTab = chrome.runtime.getURL(`/icons/new_tab.png`);
const __IED_iconSpinner = chrome.runtime.getURL(`/icons/spinner.gif`);
const __IED_iconURL = chrome.runtime.getURL(`/icons/${__IED_site}_download24.png`);

var __IED_detectedPhotos = [];
var __IED_detectedVideos = [];
var __IED_selectedPhotos = [];
var __IED_selectedVideos = [];
var __IED_previousHref;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let { action, next, category, type, observeDOM, pics, vids, url } = request;
  console.log("[IED] got action:", action, request);

  switch (action) {
    case 'showPopup':
      __IED_showPopup();
      sendResponse({result: true});
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
      // __IED_downloadSelected();
      __IED_downloadSelected(null, false); // open in new tab
      let button = document.querySelector('div[role="dialog"] button svg[aria-label="Next"]')?.closest('button');
      if (button != null) button.click(); else alert("Last post has been reached. Bulk download finished!");
      sendResponse({result: button != null});
      break;
    case 'putDownloadButton':
      let isObserved = false;
      let feedContainer = document.body;
      let findContainer = () => {
        console.log("[IED] looking for container for download button:", category);
        let containers = [];
        let container = document.body;
        switch (__IED_site) {
          case 'facebook':
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
                  // https://www.facebook.com/groups/kelakuankucing/posts/1223693578433648/
                  document.querySelector(`div[role="article"][aria-posinset="${posinset}"]>div>div>div>div>div>div:nth-child(2)>div>div:nth-child(3)`),
      
                  // https://www.facebook.com/watch/latest/?badge_type=new_videos_from_followed_page&ref=updates_surface&video_channel_type=new_videos_from_followed_page
                  document.querySelector('div[role="main"]>div>div:nth-child(2)>div>div>div>div>div>div:first-child>div:nth-child(2)>div>div>div>div>div:nth-child(2)>div:nth-child(2)'),
      
                  // https://www.facebook.com/100001108515739/videos/687024489061568
                  document.querySelector('div[role="main"] div[role="presentation"]')?.parentElement,
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
            break;
          case 'instagram':
            containers = [
              document.querySelector('article[role="presentation"] div[role="presentation"]'),
              document.querySelector('article[role="presentation"] > div > div'),
              document.querySelector('article[role="presentation"]')
            ];
            break;
          case 'twitter':
            containers = [
              document.querySelector('div[role="dialog"] img')?.parentElement,
              document.querySelector('article div[id][aria-labelledby]'),
              document.querySelector('article')
            ];
            break;
        }
        for (let i = 0; i < containers.length; i++) {
          if (containers[i]) {
            container = containers[i];
            console.log(`[IED] YEAH! container for ${category} found at index:`, i, container);
            break;
          }
        }
        return container;
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
        let totalItems = __IED_detectedPhotos.length + __IED_detectedVideos.length;
        let container = checkContainer();
        let isMulti = totalItems > 1;
        let what = `${type}${isMulti ? 's' : ''}`;
        let btn = document.createElement("button");
        btn.innerHTML = `Download ${what}` + (isMulti ? `<span>${totalItems}</span>` : ``);

        let icon = document.createElement("img");
        icon.src = __IED_iconURL;
        btn.prepend(icon);

        btn.id = __IED_downloadButtonID;
        btn.classList.add(__IED_buttonClass);
        btn.addEventListener('click', __IED_showPopup);

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

          if (observeDOM && __IED_site == 'facebook') { // only observe facebook for now
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

      __IED_detectedPhotos = pics;
      __IED_detectedVideos = vids;
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
      if (url != window.location.href) {
        console.log(`[FED] LOOOL url is not match, ${category} detection should be stopped!`);
        return sendResponse({url: window.location.href});
      }
      switch (__IED_site) {
        case 'facebook':

          // get page source
          let source = new XMLSerializer().serializeToString(document.body);
          console.info("[FED] source OK!", category);
          // console.log('[FED] source:', source);
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
                      permalink: media.permalink_url,
                      hd: fixURL(media.playable_url_quality_hd),
                      sd: fixURL(media.playable_url),
                      thumbnail: fixURL(media.preferred_thumbnail?.image.uri),
                      title: `${title} ${new Date().toISOString().substring(0, 10)}`,
                      owner,
                    };
                    console.log("[IED] GOT A FACEBOOK VIDEO STORY", media, JSON.stringify(data, null, 2));
                    videos.push(data);
                  } else {
                    let title = `${owner}'s Photo Story`;
                    let data = {
                      id: media.id,
                      height: media.image.height,
                      width: media.image.width,
                      hd: fixURL(media.image.uri),
                      sd: fixURL(media.previewImage.uri),
                      thumbnail: fixURL(media.previewImage.uri),
                      title: `${title} ${new Date().toISOString().substring(0, 10)}`,
                      owner,
                    };
                    console.log("[IED] GOT A FACEBOOK PHOTO STORY", media, JSON.stringify(data, null, 2));
                    photos.push(data);
                  }
                }
              }
            }
            break;
            default: {
              let possibleTitlePrefix = `"color_ranges":[],"text":"`;
              let possibleTitle = source.substring(source.indexOf(possibleTitlePrefix) + possibleTitlePrefix.length).split('"')[0];
              console.info("[FED] possible media title:", possibleTitle);
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
                let media;
                try {
                  media = JSON.parse(mediaSource);
                } catch(e) {
                  console.error('[FED] json malformatted', e);
                  break;
                }
                let owner = media.owner?.name || media.video_target_entity?.name || document.title.split(' - ')[0].split(' | ')[0];
                if (media.playable_url) {
                  if (media.animated_image) continue; // exclude stickers
                  if (videos.find((vid) => vid.id && vid.id == media.id)) continue;
                  let title = media.title_with_fallback || `${owner}'s Video`;
                  let data = {
                    id: media.id,
                    height: media.original_height,
                    width: media.original_width,
                    permalink: media.permalink_url,
                    duration: media.playable_duration_in_ms,
                    sd: fixURL(media.playable_url),
                    hd: fixURL(media.playable_url_quality_hd),
                    thumbnail: fixURL(media.thumbnailImage?.uri || media.preferred_thumbnail?.image.uri),
                    title,
                    possibleTitle,
                    owner,
                  };
                  console.log("[IED] GOT A FACEBOOK VIDEO", media, JSON.stringify(data, null, 2));
                  videos.push(data);
                } else {
                  if (window.location.href.includes('/watch/') || window.location.href.includes('/videos/')) continue; // there should be no photos here
                  if (media.animated_image || media.massive_image || !!media.__typename?.match(/(sticker|icon)/ig)) continue; // exclude stickers
                  if (media.associated_paid_online_event || media.canonical_uri_with_fallback) continue; // exclude recommendations
                  if (photos.find((pic) => pic.id && pic.id == media.id)) continue; // already exists
                  let title = media.title_with_fallback || `${owner}'s Photo`;
                  let possibleImages = [media.viewer_image, media.photo_image, media.image];
                  console.log("[IED] possibleImages", possibleImages);
                  let findLargest = possibleImages
                    .filter((pic) => pic && pic.uri && pic.width > 100 && pic.height > 100)
                    .sort((a,b) => a.width > b.width ? -1 : a.width < b.width ? 1 : 0);
                  console.log("[IED] findLargest", findLargest);
                  if (!findLargest.length) continue;
                  let largest = findLargest[0];
                  let medium = findLargest.length > 1 ? findLargest[1] : largest;
                  let data = {
                    id: media.id,
                    width: largest.width,
                    height: largest.height,
                    permalink: media.url,
                    hd: fixURL(largest.uri),
                    sd: fixURL(medium.uri),
                    thumbnail: fixURL(medium.uri),
                    title,
                    possibleTitle,
                    owner,
                  };
                  console.log("[IED] GOT A FACEBOOK PHOTO", media, JSON.stringify(data, null, 2));
                  photos.push(data);
                }
              }
            }
          }
          sendResponse({photos, videos});
          break;
        case 'twitter':
          let findVideos = document.querySelectorAll('article video');
          let findPhotos = document.querySelectorAll('article a[href*="/photo/"]');
          findPhotos.forEach((a) => {
            let thumbImage = a.querySelector('img');
            let thumbSrc = thumbImage?.src;
            if (thumbSrc) {
              let thumbSize = thumbSrc.split('name=').pop().split('&')[0];
              let data = {
                hd: thumbSrc.replace(`name=${thumbSize}`,'name=large'),
                sd: thumbSrc.replace(`name=${thumbSize}`,'name=medium'),
                thumbnail: thumbSrc.replace(`name=${thumbSize}`,'name=small'),
              };
              console.log("[IED] GOT A TWITTER PHOTO", thumbImage, JSON.stringify(data, null, 2));
              photos.push(data);
            }
          });
          findVideos.forEach((v) => {
            let data = {thumbnail: v.poster};
            console.log("[IED] GOT A TWITTER VIDEO", v, JSON.stringify(data, null, 2));
            videos.push(data);
          });
          sendResponse({photos, videos});
          break;
        case 'instagram':
          let images = document.querySelectorAll('article[role="presentation"] div[role="presentation"] img[src]');
          if (!images.length) images = document.querySelectorAll('article[role="presentation"] img[srcset][src]');
          if (!images.length) images = [document.querySelector('article[role="presentation"] img[src]')];

          images.forEach(img => {
            if (!!img && !img.src.includes('_s150x150')) { // abaikan foto profil
              let data = {hd: img.src};
              console.log("[IED] GOT AN INSTAGRAM PHOTO", img, JSON.stringify(data, null, 2));
              photos.push(data);
            }
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
const __IED_popupWrapperID = '__IED_popupWrapper';
const __IED_popupPhotosTitleID = '__IED_popupPhotosTitle';
const __IED_popupVideosTitleID = '__IED_popupVideosTitle';
const __IED_popupPhotosSelectAllID = '__IED_popupPhotosSelectAll';
const __IED_popupVideosSelectAllID = '__IED_popupVideosSelectAll';
const __IED_popupPhotosDLID = '__IED_popupPhotosDL';
const __IED_popupVideosDLID = '__IED_popupVideosDL';
const __IED_popupPhotosNTID = '__IED_popupPhotosNT';
const __IED_popupVideosNTID = '__IED_popupVideosNT';
const __IED_popupPhotosContainerID = '__IED_popupPhotosContainer';
const __IED_popupVideosContainerID = '__IED_popupVideosContainer';
const __IED_popupBodyID = '__IED_popupBody';
const __IED_popupActionID = '__IED_popupAction';
const __IED_popupFooterID = '__IED_popupFooter';
const __IED_popupDownloadAllID = '__IED_popupDownloadAll';
const __IED_popupReloadID = '__IED_popupReload';
const __IED_popupCloseID = '__IED_popupClose';
const __IED_popupID = '__IED_popup';

const __IED_closePopup = () => __IED_popupWrapper.classList.remove('show');
const __IED_showPopup = () => {
  let totalItems = __IED_detectedPhotos.length + __IED_detectedVideos.length;
  if (totalItems == 1) return __IED_downloadSelected(); // direct download if there are just 1 item
  let btnDownload = document.getElementById(__IED_downloadButtonID);
  btnDownload.classList.add('loading');
  btnDownload.querySelector('img').src = __IED_iconSpinner;
  __IED_selectedPhotos.length = 0;
  __IED_selectedVideos.length = 0;

  let photosCaption = __IED_popupPhotosTitle.closest(`.${__IED_captionClass}`);
  let videosCaption = __IED_popupVideosTitle.closest(`.${__IED_captionClass}`);
  
  if (__IED_detectedPhotos.length) {
    __IED_selectedPhotos = __IED_detectedPhotos.map((media) => media.url);
    __IED_popupPhotosDL.querySelector('span').innerText = __IED_detectedPhotos.length;
    __IED_popupPhotosTitle.innerHTML = `Pictures <span>${__IED_detectedPhotos.length}</span>`;
    photosCaption.style.display = 'flex';
  } else {
    photosCaption.style.display = 'none';
  }

  if (__IED_detectedVideos.length) {
    __IED_selectedVideos = __IED_detectedVideos.map((media) => media.url);
    __IED_popupVideosDL.querySelector('span').innerText = __IED_detectedVideos.length;
    __IED_popupVideosTitle.innerHTML = `Videos <span>${__IED_detectedVideos.length}</span>`;
    videosCaption.style.display = 'flex';
  } else {
    videosCaption.style.display = 'none';
  }

  __IED_popupDownloadAll.innerHTML = `<img src="${__IED_iconURL}"/>Download All<span>${totalItems}</span>`;
  __IED_popupPhotosContainer.innerHTML = '';
  __IED_popupVideosContainer.innerHTML = '';

  let getBaseName = (url) => url.split("/").pop().split('?')[0];
  let createLink = (category, media) => {
    let url = media.url;
    let node;
    if (category == 'photo') {
      let thumbnail = media.thumbnail || media.sd || media.hd;
      node = document.createElement("img");
      node.src = thumbnail;
    } else {
      let thumbnail = media.thumbnail;
      if (thumbnail) {
        node = document.createElement("img");
        node.src = thumbnail;
      } else {
        let source = document.createElement("source");
        source.src = media.sd || media.hd;
        node = document.createElement("video");
        node.appendChild(source);
      }
    }
    let a = document.createElement("a");
    a.href = url;
    a.target = '_blank';
    a.download = getBaseName(url);
    a.className = 'active';
    a.appendChild(node);
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
  __IED_detectedPhotos.forEach((media) => {
    __IED_popupPhotosContainer.appendChild(createLink('photo', media));
  });
  __IED_detectedVideos.forEach((media) => {
    __IED_popupVideosContainer.appendChild(createLink('video', media));
  });

  setTimeout(() => {
    btnDownload.classList.remove('loading');
    btnDownload.querySelector('img').src = __IED_iconURL;
    __IED_popupWrapper.classList.add('show');
  }, 500);
}
const __IED_downloadSelected = (urls, download = true) => {
  urls = urls || [...__IED_detectedPhotos, ...__IED_detectedVideos].map((media) => media.url);
  urls.forEach(url => {
    let a = document.createElement("a");
    a.href = download && __IED_site != 'twitter' ? url + (url.includes('?') ? '&' : '?') + 'dl=1' : url;
    a.target = '_blank';
    // in Twitter, direct download just not working
    if (download) a.download = url.split("/").pop().split('?')[0];
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  __IED_closePopup();
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
  :root {
    --checkbox-color: #49c59f;
    --checkbox-color-bg-hover: #d9fff1;
    --checkbox-color-disabled: #ddd;
  }
  .${__IED_buttonClass} {
    display: flex;
    align-items: center;
    border: 0;
    border-radius: 2rem;
    padding: 6px 16px;
    font-size: 12px !important;
    font-weight: 600 !important;
    color: #fff !important;
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
    margin-right: 8px !important;
    margin-left: -1px !important;
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
    cursor: pointer;
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
  .${__IED_checkboxClass}:hover {
    background-color: var(--checkbox-color-bg-hover);
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
  .${__IED_checkboxClass}:checked {
    background-color: var(--checkbox-color);
  }
  .${__IED_checkboxClass}:checked::before {
    transform: scale(1);
    box-shadow: inset 0 10px #fff;
  }
  #${__IED_popupWrapperID} {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,.75);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity .3s ease;
    font: menu;
    user-select: none;
  }
  #${__IED_popupID} {
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
  #${__IED_popupBodyID} {
    overflow-y: auto;
    flex-grow: 1;
    flex-shrink: 1;
    padding: 8px;
    padding-bottom: 0;
  }
  #${__IED_popupBodyID} button {
    filter: hue-rotate(315deg);
  }
  #${__IED_popupBodyID} button.${__IED_newTabClass} {
    filter: hue-rotate(77deg);
    margin-left: 0.45rem;
  }
  #${__IED_popupBodyID} button.${__IED_newTabClass} img {
    margin-right: 0 !important;
    width: 16px;
  }
  #${__IED_popupBodyID} .${__IED_captionClass} {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;
    white-space: nowrap;
  }
  #${__IED_popupBodyID} .${__IED_captionClass} div {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  #${__IED_popupBodyID} .${__IED_captionClass} h4 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  }
  #${__IED_popupBodyID} .${__IED_captionClass} h4 span {
    background: rgba(65, 153, 152, .2);
    padding: 2px 9px;
    margin-left: 3px;
    border-radius: 20px;
    color: #1f947c;
  }
  #${__IED_popupBodyID} .${__IED_captionClass} label {
    display: flex;
    margin: 0 12px;
    cursor: pointer;
  }
  #${__IED_popupBodyID} .${__IED_captionClass} input[type='checkbox'] {
    margin-right: 4px;
  }
  #${__IED_popupPhotosContainerID},
  #${__IED_popupVideosContainerID} {
    display: block;
    margin-bottom: 8px;
    line-height: 0;
  }
  #${__IED_popupPhotosContainerID} img,
  #${__IED_popupVideosContainerID} img,
  #${__IED_popupVideosContainerID} video {
    height: 120px;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all .2s ease-out;
  }
  #${__IED_popupPhotosContainerID} img:hover,
  #${__IED_popupVideosContainerID} img:hover,
  #${__IED_popupVideosContainerID} video:hover {
    transform: scale(1.05);
    filter: brightness(1.1) contrast(1) drop-shadow(0 2px 5px rgba(0,0,0,.2));
  }
  #${__IED_popupBodyID} a {
    position: relative;
    display: inline-block;
    margin-right: 12px;
    margin-bottom: 12px;
  }
  #${__IED_popupBodyID} a:active {
    opacity: 1;
  }
  #${__IED_popupBodyID} a::after {
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
  #${__IED_popupBodyID} a.active::after {
    opacity: 1;
    transform: scale(1);
  }
  #${__IED_popupPhotosContainerID} a.active img,
  #${__IED_popupVideosContainerID} a.active img,
  #${__IED_popupVideosContainerID} a.active video {
    outline: 3px solid #31a97cd1;
    transform: scale(1.02);
  }
  #${__IED_popupActionID} {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
  }
  #${__IED_popupActionID} > div {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  #${__IED_popupActionID} > div > button {
    margin: 0 .35rem;
  }
  #${__IED_popupFooterID} {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    white-space: nowrap;
    margin-top: 1rem;
    font-size: .7rem;
  }
  #${__IED_popupFooterID} div {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 105%;
    font-weight: 700;
    margin-right: 12px;
  }
  #${__IED_popupFooterID} div img {
    width: 20px;
    margin-right: 4px;
  }
  #${__IED_popupFooterID} a {
    font-weight: 600;
  }
  #${__IED_popupDownloadAllID} {
    padding: 8px 18px;
  }
  #${__IED_popupReloadID} {
    filter: hue-rotate(45deg);
  }
  #${__IED_popupCloseID} {
    color: #fff;
    font-size: 13px;
    position: absolute;
    text-align: center;
    bottom: 0;
    margin: 0 0 1rem 0;
    pointer-events: none;
  }
  #${__IED_popupWrapperID}.show {
    pointer-events: auto;
    opacity: 1;
  }
  #${__IED_popupWrapperID}.show #${__IED_popupID} {
    box-shadow: 0 2px 20px -7px #00000063, 0 2px 150px -7px #0000008c;
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
<div id="${__IED_popupWrapperID}">
  <div id="${__IED_popupID}">
    <div id="${__IED_popupBodyID}">
      <div class="${__IED_captionClass}">
        <div>
          <h4 id="${__IED_popupPhotosTitleID}"></h4>
          <label>
            <input type="checkbox" id="${__IED_popupPhotosSelectAllID}" class="${__IED_checkboxClass}" checked/>Select all
          </label>
        </div>
        <div>
          <button class="${__IED_buttonClass}" id="${__IED_popupPhotosDLID}">Download Selected<span></span></button>
          <button class="${__IED_buttonClass} ${__IED_newTabClass}" id="${__IED_popupPhotosNTID}"></button>
        </div>
      </div>
      <div id="${__IED_popupPhotosContainerID}"></div>
      <div class="${__IED_captionClass}">
        <div>
          <h4 id="${__IED_popupVideosTitleID}"></h4>
          <label>
            <input type="checkbox" id="${__IED_popupVideosSelectAllID}" class="${__IED_checkboxClass}" checked/>Select all
          </label>
        </div>
        <div>
          <button class="${__IED_buttonClass}" id="${__IED_popupVideosDLID}">Download Selected<span></span></button>
          <button class="${__IED_buttonClass} ${__IED_newTabClass}" id="${__IED_popupVideosNTID}"></button>
        </div>
      </div>
      <div id="${__IED_popupVideosContainerID}"></div>
    </div>
    <div id="${__IED_popupActionID}">
      <div>
        Displayed wrong items?
        <button class="${__IED_buttonClass}" id="${__IED_popupReloadID}">Reload Page</button>
      </div>
      <div>
        <button class="${__IED_buttonClass}" id="${__IED_popupDownloadAllID}"></button>
      </div>
    </div>
    <div id="${__IED_popupFooterID}">
      <div>
        <img src="${__IED_icon}"/>
        Social Media Easy Download
      </div>
      <span>
        by Taufik Nur Rahmanda - <a href="https://www.taufiknur.com/" target="_blank">Visit my Website</a>
      </span>
    </div>
  </div>
  <p id="${__IED_popupCloseID}">Click anywhere to close</p>
</div>
`);

const __IED_downloadSelectedPics = (download = true) => __IED_downloadSelected(__IED_selectedPhotos, download);
const __IED_downloadSelectedVids = (download = true) => __IED_downloadSelected(__IED_selectedVideos, download);
const __IED_downloadSelectedMedia = () => __IED_downloadSelected([...__IED_selectedPhotos, ...__IED_selectedVideos]);
const __IED_countSelectedMedia = () => {
  let activePhotos = [...__IED_popupPhotosContainer.querySelectorAll('a.active')];
  let activeVideos = [...__IED_popupVideosContainer.querySelectorAll('a.active')];
  let activePhotosURLs = activePhotos.map((item) => item.href);
  let activeVideosURLs = activeVideos.map((item) => item.href);
  __IED_selectedPhotos = activePhotosURLs;
  __IED_selectedVideos = activeVideosURLs;
  __IED_popupPhotosDL.querySelector('span').innerText = activePhotos.length;
  __IED_popupVideosDL.querySelector('span').innerText = activeVideos.length;
  __IED_popupDownloadAll.querySelector('span').innerText = __IED_selectedPhotos.length + __IED_selectedVideos.length;
  let selectAllPhotos = __IED_selectedPhotos.length == __IED_detectedPhotos.length;
  let selectAllVideos = __IED_selectedVideos.length == __IED_detectedVideos.length;
  __IED_popupPhotosSelectAll.checked = selectAllPhotos;
  __IED_popupVideosSelectAll.checked = selectAllVideos;
  console.log('[IED] selected photos:', __IED_selectedPhotos.length, '/', __IED_detectedPhotos.length, selectAllPhotos);
  console.log('[IED] selected videos:', __IED_selectedVideos.length, '/', __IED_detectedVideos.length, selectAllVideos);
};

const __IED_popupWrapper = document.getElementById(__IED_popupWrapperID);
const __IED_popupDownloadAll = document.getElementById(__IED_popupDownloadAllID);
const __IED_popupPhotosContainer = document.getElementById(__IED_popupPhotosContainerID);
const __IED_popupPhotosTitle = document.getElementById(__IED_popupPhotosTitleID);
const __IED_popupPhotosDL = document.getElementById(__IED_popupPhotosDLID);
const __IED_popupPhotosNT = document.getElementById(__IED_popupPhotosNTID);
const __IED_popupVideosContainer = document.getElementById(__IED_popupVideosContainerID);
const __IED_popupVideosTitle = document.getElementById(__IED_popupVideosTitleID);
const __IED_popupVideosDL = document.getElementById(__IED_popupVideosDLID);
const __IED_popupVideosNT = document.getElementById(__IED_popupVideosNTID);
const __IED_popupPhotosSelectAll = document.getElementById(__IED_popupPhotosSelectAllID);
const __IED_popupVideosSelectAll = document.getElementById(__IED_popupVideosSelectAllID);

__IED_popupWrapper.addEventListener('click', __IED_closePopup);
__IED_popupDownloadAll.addEventListener('click', __IED_downloadSelectedMedia);
__IED_popupPhotosDL.addEventListener('click', () => __IED_downloadSelectedPics(true));
__IED_popupPhotosNT.addEventListener('click', () => __IED_downloadSelectedPics(false));
__IED_popupVideosDL.addEventListener('click', () => __IED_downloadSelectedVids(true));
__IED_popupVideosNT.addEventListener('click', () => __IED_downloadSelectedVids(false));

document.getElementById(__IED_popupID).addEventListener('click', (e) => e.stopPropagation());
document.getElementById(__IED_popupReloadID).addEventListener('click', () => window.location.reload());
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
