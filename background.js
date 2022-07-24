var isReady = false;
var pics = [];
var vids = [];
var bulkDownload;
var selectDownload;
var currentTab;
var fetchController;
var fetchTimeout = 5000;
var inFocus = true;

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[IED] onInstalled", details);
  switch (details.reason) {
    case 'install':
      // chrome.runtime.setUninstallURL('https://example.com/extension-survey'); // Define post-uninstall survey link
      chrome.tabs.create({ url: 'onboarding.html' }); // Open the onboarding page after install
      break;
    case 'update':
      // localStorage.clear(); // Clear data after update
      break;
  }
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("[IED] action from foreground", request, sender);
  let { action, url } = request;
  let response = {ok: true};
  switch (action) {
    case 'handshake':
      console.log("[IED] received handshake", currentTab);
      if (!currentTab?.url) {
        response.ok = false;
        break;
      }
      updatePopup();
      break;
    case 'showPopup':
      showPopup();
      break;
    case 'recheck':
      analyzeTab();
      break;
    case 'extractMedia':
      sendToForeground('extractMedia');
      break;
    case 'selectDownload':
      sendToForeground('selectDownload', {}, null, (result) => {
        if (result) selectDownload = currentTab.id;
      });
      break;
    case 'selectDownloadInstagram':
      console.log('[IED] selectDownloadInstagram url', url);
      fetchInstagramPost(url).then((urls) => {
        sendToForeground('selectDownload', {urls, url}, selectDownload);
      });
      break;
    case 'bulkDownload':
      // sendToForeground('bulkDownload', {}, null, (result) => {});
      // chrome.tabs.sendMessage(currentTab.id, { action: 'bulkDownload' }, function(response) {
      //   let error = chrome.runtime.lastError;
      //   if (error) return console.log('[IED] bulkDownload error:', error.message);
      //   if (response?.result) {
      //     bulkDownload = currentTab.id;
      //     analyzeTab();
      //   }
      // });
      sendToForeground('bulkDownload');
      bulkDownload = currentTab.id;
      analyzeTab();
      break;
    case 'bulkStop':
      stopBulkDownload();
      break;
  }
  sendResponse({action, ...response});
});
chrome.tabs.onActivated.addListener(function(info) {
  console.log('[IED] tab activated', info);
  analyzeTab();
});
chrome.tabs.onUpdated.addListener(async function(tabId, info, tab) {
  console.log('[IED] tab updated', tabId, tab, info);
  if (info.status == 'complete' && tab.selected && tab.active) {
    analyze(tab);
  }
});
chrome.tabs.onRemoved.addListener(function(tabId, removed) {
  if (selectDownload == tabId || bulkDownload == tabId) {
    stopBulkDownload();
  }
});
chrome.windows.onFocusChanged.addListener(function(window) {
  inFocus = window != chrome.windows.WINDOW_ID_NONE;
  console.log('[IED] window focus', inFocus);
  if (inFocus) analyzeTab();
});

function sendToForeground(action, message = {}, tabID = null, onResult = () => {}) {
  chrome.tabs.sendMessage(tabID || currentTab.id, { action, ...message }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log(`[IED] ${action} error:`, error.message);
    console.log(`[IED] ${action} result:`, response?.result);
    onResult(response?.result);
  });
}
function sendToPopup(action, message = {}) {
  chrome.runtime.sendMessage({action, ...message}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) console.log('[BG] sendToPopup error:', action, error.message);
    else console.log('[BG] sendToPopup response:', action, response);
  });
}

function isURLFacebook(url) {
  return url && /https:\/\/[\w]+\.facebook\.com/.test(url);
}
function isURLFacebookVideo(url) {
  return isURLFacebook(url) && (
    url.includes('/videos/') ||
    url.includes('/watch/') ||
    url.includes('/watch?') ||
    url.includes('/permalink.php?story_fbid=') ||
    url.includes('/posts/')
  );
}
function isURLFacebookPhoto(url) {
  return isURLFacebook(url) && (
    url.includes('/photo/?') ||
    url.includes('/photo?') ||
    url.includes('/photos/') ||
    url.includes('/posts/')
  );
}
function isURLFacebookStory(url) {
  return isURLFacebook(url) && url.includes('/stories/');
}
function isURLTwitter(url) {
  return url && /https:\/\/twitter\.com/.test(url);
}
function isURLTwitterPost(url) {
  return url && /https:\/\/twitter\.com\/[\w]+[\/]?[\w]+\/status\/[\w]+/.test(url);
}
function isURLInstagram(url) {
  return url && /https:\/\/[\w]+\.(.*)instagram\.com/.test(url); // to support domain https://www.secure.instagram.com/
}
function isURLInstagramPost(url) {
  return url && (
    /https:\/\/[\w]+\.(.*)instagram\.com\/p\//.test(url) ||
    /https:\/\/[\w]+\.(.*)instagram\.com\/reel\//.test(url)
  );
}

function showPopup() {
  chrome.tabs.sendMessage(currentTab.id, { action: 'showPopup' }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log('[IED] showPopup error:', error.message);
    console.log('[IED] showPopup result:', response?.result);
  });
}

function generateIcons(tabId, name, suffix = '') {
  console.log('[IED] set action icon', tabId, name);
  chrome.action.setIcon({tabId, path: {
    "16": "icons/" + name + suffix + "16.png",
    "24": "icons/" + name + suffix + "24.png",
    "32": "icons/" + name + suffix + "32.png"
  }});
  isReady = suffix == 'download';
  console.log('[IED] isReady', isReady);
  if (isReady) updatePopup();
}

function updatePopup() {
  if (!currentTab?.url) return;
  if (!pics.length && !vids.length) detectTabs();
  let { url } = currentTab;

  const isInstagram = isURLInstagram(url);
  const isInstagramPost = isURLInstagramPost(url);
  const isBulkAvaiable = isInstagram && !isInstagramPost;
  const isBulkOngoing = !!bulkDownload;
  const isSelectOngoing = !!selectDownload;

  sendToPopup('handshake', {url, pics, vids, isBulkAvaiable, isBulkOngoing, isSelectOngoing});
}

function stopBulkDownload() {
  if (selectDownload) {
    sendToForeground('selectStop', {}, selectDownload);
    selectDownload = null;
  }
  bulkDownload = null;
  fetchController?.abort();
  analyzeTab();
}

function analyze(tab) {
  console.log("[IED] analyze tab", tab);
  if (!tab?.selected || !tab?.active) return;
  
  const { url, status } = tab;
  const isFacebook = isURLFacebook(url);
  const isFacebookVideo = isURLFacebookVideo(url);
  const isFacebookStory = isURLFacebookStory(url);
  const isFacebookPhoto = isURLFacebookPhoto(url);
  const isFacebookPost = isFacebookVideo || isFacebookStory || isFacebookPhoto;
  const isInstagram = isURLInstagram(url);
  const isInstagramPost = isURLInstagramPost(url);
  const isTwitter = isURLTwitter(url);
  const isTwitterPost = isURLTwitterPost(url);
  const tabId = tab.id;

  console.log("[IED] tab status", status);
  console.log("[IED] tab is facebook", isFacebook);
  console.log("[IED] tab is facebook post", isFacebookPost);
  console.log("[IED] tab is instagram", isInstagram);
  console.log("[IED] tab is instagram post", isInstagramPost);
  console.log("[IED] tab is twitter", isTwitter);
  console.log("[IED] tab is twitter post", isTwitterPost);
  
  if (currentTab?.url && url != currentTab.url) {
    console.log("[IED] LOL tab url has changed:", currentTab?.url, '->', url);
  }

  currentTab = tab;
  pics.length = 0;
  vids.length = 0;

  let site;

  if (isFacebook) {
    site = 'facebook';
  } else if (isTwitter) {
    site = 'twitter';
  } else if (isInstagram) {
    site = 'instagram';
  } else {
    chrome.action.setTitle({title: 'Open a Facebook, Instagram, or Twitter post to download its photo and videos', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, 'icon');
    sendToPopup('nothing');
    return;
  }

  if (status !== "complete") {
    chrome.action.setTitle({title: 'Loading contents. Please wait ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, site);
    return;
  }
  
  console.log("[IED] load tab complete");

  if (isFacebookPost) {
    setTimeout(() => { // need to be delayed until the dynamic contents loaded in DOM
      detectMedia(tab, site, isFacebookVideo ? 'video' : isFacebookStory ? 'story' : 'photo');
    }, 1000);
    chrome.action.setTitle({title: 'Counting Facebook photos and videos ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, site, '_counting');
  } else if (isTwitterPost) {
    fetchTwitterPost(tab);
    chrome.action.setTitle({title: 'Counting Twitter photos and videos ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, site, '_counting');
  } else if (isInstagramPost) {
    fetchInstagramPost(tab);
    chrome.action.setTitle({title: 'Counting Instagram photos and videos ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, site, '_counting');
  } else if (bulkDownload == tabId) {
    chrome.action.setTitle({title: 'Cancel bulk download operation', tabId});
    chrome.action.setBadgeBackgroundColor({'color': '#a1183d'});
    chrome.action.setBadgeText({'text': 'Stop'});
    generateIcons(tabId, site, '_counting');
  } else {
    chrome.action.setTitle({title: 'Bulk download photos and videos HD in 1-click', tabId});
    chrome.action.setBadgeBackgroundColor({'color': '#333333'});
    chrome.action.setBadgeText({'text': 'All'});
    generateIcons(tabId, site, '_download');
  }
};

function setDownloadIcon(tab, site, category, totalDetectedMedia) {
  let detectionCount = pics.length + vids.length;
  console.log("[IED] detection count", detectionCount, '/', totalDetectedMedia);
  if (!detectionCount) return;
  let type = pics.length && vids.length ? 'photo & video' : pics.length ? 'photo' : 'video';
  let what = `${type}${detectionCount > 1 ? 's' : ''}`;
  chrome.action.setTitle({title: `Click to ${detectionCount > 1 ? 'view' : 'download'} ${detectionCount} ${site[0].toUpperCase() + site.slice(1)} ${what}`, tabId: tab.id});
  chrome.action.setBadgeBackgroundColor({'color': '#333333'});
  chrome.action.setBadgeText({'text': `${detectionCount}`});
  generateIcons(tab.id, '', 'download');

  // on detection complete
  if (detectionCount == totalDetectedMedia) {
    console.log("[IED] detection completed!");

    // put download button in foreground
    putDownloadButton(tab, site, category, type);

    // bulk download per post
    if (bulkDownload == tab.id) {
      sendToForeground('nextPost', {}, tab.id, (result) => {
        if (!result) bulkDownload = null;
      });
      // chrome.tabs.sendMessage(tab.id, { action: 'nextPost' }, function(response) {
      //   let error = chrome.runtime.lastError;
      //   if (error) return console.log('[IED] nextPost error:', error.message);
      //   if (!response?.result) {
      //     bulkDownload = null;
      //   }
      // });
    }
  }
}

function putDownloadButton(tab, site, category, type, observeDOM = true, retry = 0) {
  chrome.tabs.sendMessage(tab.id, { action: 'putDownloadButton', category, type, observeDOM, pics, vids }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log(`[IED] putDownloadButton ${site} error:`, error.message);
    console.log(`[IED] putDownloadButton ${site} result:`, response, tab.url);
    if (response?.container == 'body' && response?.url == tab.url) { // container not found yet
      if (retry < 10) { // max retry is 10 seconds
        setTimeout(() => { // wait another second for right container to be found
          putDownloadButton(tab, site, category, type, !response.isObserved, retry + 1);
        }, 1000);
      }
    }
  });
}

function detectMedia(tab, site, category = 'post', next = true) {
  const {url} = tab;
  console.log(`[IED] counting media on ${site}:`, url);
  chrome.tabs.sendMessage(tab.id, { action: 'detectMedias', category, next, url }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log(`[IED] detectMedias ${site} error:`, error.message);
    if (response == null) return console.warn(`[IED] detectMedias got an empty response`);
    let photos = response.photos || [];
    let videos = response.videos || [];
    let endURL = response.url || url;
    photos.forEach((media) => { pushDetectedMedia(media, pics); });
    // using DOM detection method, can only detect video poster in Twitter & Instagram
    // so hopefully the GET detection method was succeeded
    videos.forEach((media) => { pushDetectedMedia(media, vids); });
    let totalDetectedMedia = pics.length + vids.length;
    if (site == 'instagram') { // can count exact total on instagram
      totalDetectedMedia = response.total || 0;
      let detectionCount = pics.length + vids.length;
      if (url == endURL && (!totalDetectedMedia || detectionCount < totalDetectedMedia)) { // detection is ongoing
        console.log(`[IED] counting ${category} on ${site} progress: ${detectionCount}/${totalDetectedMedia}`);
        detectMedia(tab, site, category, response.canContinue ? next : !next);
      }
    } else if (!totalDetectedMedia) {
      // TODO need to retry?
    }
    setDownloadIcon(tab, site, category, totalDetectedMedia);
  });
}

function pushDetectedMedia(media, arr) {
  let url = media.hd || media.sd;
  if (!url) return;
  if (
    !arr.map((item) => item.url).includes(url) &&
    !arr.map((item) => item.url.split('?')[0]).includes(url.split('?')[0])
  ) arr.push({...media, url});
}

function fetchTwitterPost(tab) {
  // photo: https://cdn.syndication.twimg.com/tweet?id=1510768091047014400
  // video: https://cdn.syndication.twimg.com/tweet?id=1493602413508706304
  let statusID = tab.url.split('/status/').pop().split('/')[0];
  let fetchUrl = `https://cdn.syndication.twimg.com/tweet?id=${statusID}`;
  console.log(`[IED] should fetch:`, fetchUrl);
  fetchWithTimeout(fetchUrl, { timeout: fetchTimeout }).then(async data => {
    let tabCurrent = await getCurrentTab();
    if (tabCurrent?.url !== tab.url) {
      console.log('[IED] fetch result ignored because url changed');
      return;
    }
    console.log(`[IED] fetch result:`, data);
    let findVideos = data.video?.variants.filter((variant) => variant.type == "video/mp4") || [];
    let findPhotos = data.photos || [];
    let owner = data.user?.name;
    let title = owner ? `${owner}'s Video` : data.text;
    // if (!findVideos.length && !findPhotos.length) return;
    if (findVideos.length) {
      let findLargest = findVideos.sort((a,b) => {
        let widthA = a.src.split('/vid/').pop().split('x')[0];
        let widthB = b.src.split('/vid/').pop().split('x')[0];
        return widthA > widthB ? -1 : widthA < widthB ? 1 : 0;
      });
      let hd = findLargest[0].src;
      let sd = findLargest.length > 1 ? findLargest[1].src : hd;
      let item = {
        id: statusID,
        hd,
        sd,
        thumbnail: data.video?.poster,
        duration: data.video?.durationMs,
        permalink: data.entities?.media[0].expanded_url,
        owner,
        title,
      };
      console.log("[IED] GOT A TWITTER VIDEO", data.video, JSON.stringify(item, null, 2));
      pushDetectedMedia(item, vids);
    } else if (findPhotos.length) {
      findPhotos.forEach((photo) => {
        // original size image, but a bit noisy: https://pbs.twimg.com/media/FYBuHjvacAEMUZd?format=png&name=4096x4096
        let suffix = '?format=png&name=4096x4096';
        // let suffix = '?format=png&name=large';
        let item = {
          sd: photo.url,
          hd: photo.url.split('.').slice(0, -1).join('.') + suffix,
          permalink: photo.expandedUrl,
          width: photo.width,
          height: photo.height,
        }
        console.log("[IED] GOT A TWITTER PHOTO", photo, JSON.stringify(item, null, 2));
        pushDetectedMedia(item, pics);
      });
    }
    setDownloadIcon(tab, 'twitter', 'post', pics.length + vids.length);
  }).catch(err => {
    console.warn(`[IED] couldn't fetch twitter post`, err, typeof err);
    setTimeout(() => {
      // will detect from DOM, here we not be able to get the videos, only photos & video posters
      detectMedia(tab, 'twitter');
    }, 1000);
  });

}
async function fetchInstagramPost(tab) {
  console.log(`[IED] fetch instagram post post tab:`, tab, typeof tab);
  const isTab = typeof tab !== 'string';
  const postUrl = isTab ? tab.url : tab;
  console.log(`[IED] fetch instagram post post url:`, postUrl);
  const fetchUrl = postUrl + (postUrl.includes('?') ? '&' : '?') + '__a=1&__d=dis';
  let data = await fetchWithTimeout(fetchUrl, { timeout: fetchTimeout }).catch(err => {
    console.warn('[IED] read json error', err, typeof err);
    if (isTab) setTimeout(() => {
      // will detect from DOM, here we not be able to get the videos, only photos & video posters
      detectMedia(tab, 'instagram');
    }, 1000);
  });
  if (!data) return;
  if (isTab && (await getCurrentTab())?.url !== postUrl) {
    console.log('[IED] fetch result ignored because url changed');
    return;
  }
  console.log('[IED] read json success', JSON.stringify(data, null, 2));
  if (!data.items) {
    console.warn('[IED] read json got unexpected result!');
    return;
  }
  let detectionUrls = [];
  let imageVersions = data.items[0].image_versions2;
  let videoVersions = data.items[0].video_versions;
  let carouselMedia = data.items[0].carousel_media;
  if (carouselMedia) {
    carouselMedia.forEach((media) => {
      console.log("[IED] carouselMedia", media);
      let mediaPhoto = media.image_versions2.candidates[0];
      let mediaVideo = media.video_versions ? media.video_versions[0] : null;
      let imageUrl = mediaPhoto.url;
      let videoUrl = mediaVideo?.url;
      if (videoUrl) {
        let data = {
          id: mediaVideo?.id,
          width: mediaVideo?.width,
          height: mediaVideo?.height,
          hd: videoUrl,
        };
        console.log("[IED] GOT A INSTAGRAM VIDEO", mediaVideo, JSON.stringify(data, null, 2));
        pushDetectedMedia(data, vids);
        detectionUrls.push(videoUrl);
      } else if (imageUrl) {
        let data = {
          width: mediaPhoto.width,
          height: mediaPhoto.height,
          hd: imageUrl,
        };
        console.log("[IED] GOT A INSTAGRAM PHOTO", mediaPhoto, JSON.stringify(data, null, 2));
        pushDetectedMedia(data, pics);
        detectionUrls.push(imageUrl);
      }
    });
  } else if (videoVersions) {
    let mediaVideo = videoVersions[0];
    let videoUrl = mediaVideo.url;
    if (videoUrl) {
      let data = {
        id: mediaVideo.id,
        width: mediaVideo.width,
        height: mediaVideo.height,
        hd: videoUrl,
      };
      console.log("[IED] GOT A INSTAGRAM VIDEO", mediaVideo, JSON.stringify(data, null, 2));
      pushDetectedMedia(data, vids);
      detectionUrls.push(videoUrl);
    }
  } else if (imageVersions) {
    let mediaPhoto = imageVersions.candidates[0];
    let imageUrl = mediaPhoto.url;
    if (imageUrl) {
      let data = {
        width: mediaPhoto.width,
        height: mediaPhoto.height,
        hd: imageUrl,
      };
      console.log("[IED] GOT A INSTAGRAM PHOTO", mediaPhoto, JSON.stringify(data, null, 2));
      pushDetectedMedia(data, pics);
      detectionUrls.push(imageUrl);
    }
  }
  if (isTab) setDownloadIcon(tab, 'instagram', 'post', pics.length + vids.length);
  return detectionUrls;
}

async function fetchWithTimeout(url, options = {}) {
  const { timeout = 60000 } = options;
  fetchController = new AbortController();
  const id = setTimeout(() => fetchController.abort(), timeout);
  const responseJson = await fetch(url, {
    ...options,
    signal: fetchController.signal  
  }).then(res => res.json());
  clearTimeout(id);
  return responseJson;
}

async function getCurrentTab(todo) {
  let queryOptions = { active: true, currentWindow: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function detectTabs() {
  let tabs = await chrome.tabs.query({ lastFocusedWindow: true, windowType: 'normal' });
  let mediaTabs = tabs.filter(tab => isMediaURL(tab.url));
  console.info(`[IED] detectTabs opened media: ${mediaTabs.length} / ${tabs.length}`);
  sendToPopup('mediaTabs', {tabs: mediaTabs});
}

function isMediaURL(url) {
  return /^http[^\?]*.(jpg|jpeg|tiff|gif|png|webp|bmp|apng|svg|mp4)(.*)(\?(.*))?$/gmi.test(url) ||
        /https:\/\/pbs.twimg.com\/media\/[\w]+\?format=[\w]+&name=[\w]+/.test(url);
}

function analyzeTab() {
  getCurrentTab().then(analyze);
}

analyzeTab();