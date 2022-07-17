var isReady = false;
var pics = [];
var vids = [];
var bulkDownload;
var currentTab;
var fetchController;
var inFocus = true;

const fetchTimeout = 3000;

chrome.action.onClicked.addListener(() => onIconClick());
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("[IED] action from foreground", request, sender);
  let { action, download } = request;
  let response = {ok: true};
  switch (action) {
    // case 'clickIcon': // TODO unused
    //   response.ok = onIconClick(download);
    //   break;
    case 'escapeKey':
      if (bulkDownload == currentTab.id) stopBulkDownload();
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
chrome.windows.onFocusChanged.addListener(function(window) {
  inFocus = window != chrome.windows.WINDOW_ID_NONE;
  console.log('[IED] window focus', inFocus);
  if (inFocus) analyzeTab();
});

async function getCurrentTab(todo) {
  let queryOptions = { active: true, currentWindow: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  todo(tab);
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
  return url && /https:\/\/twitter\.com\/[\w]+\/status\/[\w]+/.test(url);
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

// function downloadMedias(medias, download = false) { // TODO unused
//   medias = medias || [...pics, ...vids];
//   console.log('[IED] download medias from', currentTab, medias);
//   chrome.tabs.sendMessage(currentTab.id, { action: 'downloadMedias', medias, download }, function(response) {
//     let error = chrome.runtime.lastError;
//     if (error) return console.log('[IED] downloadMedias error:', error.message);
//     console.log('[IED] downloadMedias result:', response?.result);
//   });
// }

function showPopup() {
  chrome.tabs.sendMessage(currentTab.id, { action: 'showPopup' }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log('[IED] showPopup error:', error.message);
    console.log('[IED] showPopup result:', response?.result);
  });
}

function onIconClick(download = false) {
  console.log('[IED] onIconClick tab', currentTab, isReady);
  console.log('[IED] onIconClick direct download', download);
  if (!currentTab || !isReady) {
    console.warn('[IED] tab not ready, still counting ...');
    analyzeTab();
    return false;
  }
  const { url } = currentTab;
  const isFacebookPost = isURLFacebookVideo(url) || isURLFacebookStory(url) || isURLFacebookPhoto(url);
  const isTwitterPost = isURLTwitterPost(url);
  const isInstagramPost = isURLInstagramPost(url);
  const isInstagram = isURLInstagram(url);

  if (isFacebookPost || isInstagramPost || isTwitterPost) { // if it's a post page
    // downloadMedias(null, download);
    showPopup();
  } else if (isInstagram) { // if it's an instagram profile page
    if (bulkDownload == currentTab.id) return stopBulkDownload();
    chrome.tabs.sendMessage(currentTab.id, { action: 'bulkDownload' }, function(response) {
      let error = chrome.runtime.lastError;
      if (error) return console.log('[IED] bulkDownload error:', error.message);
      if (response?.result) {
        bulkDownload = currentTab.id;
        analyzeTab();
      }
    });
  } else { // click action not supported in this page
    analyzeTab();
  }
  return true;
}

function generateIcons(tabId, name, suffix = '') {
  console.log('[IED] set action icon', tabId, name);
  chrome.action.setIcon({tabId, path: {
    "16": "icons/" + name + suffix + "16.png",
    "24": "icons/" + name + suffix + "24.png",
    "32": "icons/" + name + suffix + "32.png"
  }});
  isReady = suffix != '_counting';
  console.log('[IED] isReady', isReady);
}

function stopBulkDownload() {
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
    console.log("[IED] LOL tab url has changed");
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
    chrome.action.setTitle({title: 'Open an Instagram or Twitter post to download its photos and video HD', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, 'icon');
    return;
  }

  if (status !== "complete") {
    chrome.action.setTitle({title: 'Loading content. Please wait ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, site);
    return;
  }
  
  console.log("[IED] load tab complete");

  if (isFacebookPost) {
    setTimeout(() => {
      detectMedia(tab, site, isFacebookVideo ? 'video' : isFacebookStory ? 'story' : 'photo');
    }, 1000);
    chrome.action.setTitle({title: 'Counting Facebook photos and videos ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, site, '_counting');
  } else if (isTwitterPost) {
    detectMedia(tab, site);
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

function setDownloadIcon(tab, site, category, picTotal) {
  let picCount = pics.length + vids.length;
  console.log("[IED] detection count", picCount, '/', picTotal);
  if (!picCount) return;
  let type = pics.length && vids.length ? 'photo & video' : pics.length ? 'photo' : 'video';
  let what = `${type}${picCount > 1 ? 's' : ''}`;
  chrome.action.setTitle({title: `Click to start download ${picCount > 1 ? 'all ' : ''}${picCount} ${what}`, tabId: tab.id});
  chrome.action.setBadgeBackgroundColor({'color': '#333333'});
  chrome.action.setBadgeText({'text': `${picCount}`});
  generateIcons(tab.id, site, '_download');

  // on detection complete
  if (picCount == picTotal) {
    console.log("[IED] detection completed!");

    // put download button in foreground
    putDownloadButton(tab, site, category, type);

    // bulk download per post
    if (bulkDownload == tab.id) {
      onIconClick();
      chrome.tabs.sendMessage(tab.id, { action: 'nextPost' }, function(response) {
        let error = chrome.runtime.lastError;
        if (error) {
          console.log('[IED] nextPost error:', error.message);
        } else if (!response?.result) {
          bulkDownload = null;
        }
      });
    }
  }
}

function putDownloadButton(tab, site, category, type, observeDOM = true, retry = 0) {
  chrome.tabs.sendMessage(tab.id, { action: 'putDownloadButton', category, type, observeDOM, pics, vids }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log(`[IED] putDownloadButton ${site} error:`, error.message);
    console.log(`[IED] putDownloadButton ${site} result:`, response);
    if (response?.container == 'body') { // container not found yet
      if (retry < 10) { // max retry is 10 seconds
        setTimeout(() => { // wait another second for right container to be found
          putDownloadButton(tab, site, category, type, !response.isObserved, retry + 1);
        }, 1000);
      }
    }
  });
}

function detectMedia(tab, site, category = 'post', next = true) {
  console.log(`[IED] counting media on ${site}:`, tab.url);
  chrome.tabs.sendMessage(tab.id, { action: 'detectMedias', category, next }, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.log(`[IED] detectMedias ${site} error:`, error.message);
    if (response == null) return console.warn(`[IED] detectMedias got an empty response`);
    let picTotal = response.total || 0;
    let photos = response.photos || [];
    let videos = response.videos || [];
    if (site == 'facebook') {
      photos.forEach((media) => { pushPic(media.hd || media.sd); });
      videos.forEach((media) => { pushPic(media.hd || media.sd, 'video'); });
      picTotal = pics.length + vids.length;
    } else {
      photos.forEach((pic) => { pushPic(pic); });
    }
    let detectionCount = pics.length + vids.length;
    setDownloadIcon(tab, site, category, picTotal);
    if (site != 'facebook' && (!picTotal || detectionCount < picTotal)) { // detection is ongoing
      console.log(`[IED] counting ${category} on ${site} progress: ${detectionCount}/${picTotal}`);
      detectMedia(tab, site, category, response.canContinue ? next : !next);
    } else if (site == 'twitter' && videos.length) { // fetch twitter videos
      fetchTwitterVideo(tab);
    }
  });
}

function pushPic(url, type = 'photo') {
  if (!url) return;
  if (type == 'photo') {
    if (!pics.includes(url) && !pics.map((pic) => pic.split('?')[0]).includes(url.split('?')[0])) pics.push(url);
  } else {
    if (!vids.includes(url) && !vids.map((pic) => pic.split('?')[0]).includes(url.split('?')[0])) vids.push(url);
  }
}

function fetchTwitterVideo(tab) {
  let statusID = tab.url.split('/status/').pop().split('/')[0];
  let fetchUrl = `https://cdn.syndication.twimg.com/tweet?id=${statusID}`;
  console.log(`[IED] should fetch:`, fetchUrl);
  fetchWithTimeout(fetchUrl, { timeout: 60000 }).then(data => {
    console.log(`[IED] fetch result:`, data);
    let variants = data.video?.variants.filter((variant) => variant.type == "video/mp4") || [];
    let largest, lastSize = 0;
    variants.forEach((variant) => {
      let size = variant.src.split('/vid/').pop().split('x')[0];
      if (size > lastSize) largest = variant;
      lastSize = size;
    });
    if (!!largest) {
      console.log(`[IED] largest video url:`, largest.src);
      pushPic(largest.src, 'video');
      setDownloadIcon(tab, 'twitter', 'post', pics.length + vids.length);
    }
  }).catch(err => {
    console.warn(`[IED] couldn't fetch twitter video`, err, typeof err);
  });

}
function fetchInstagramPost(tab) {
  const getParams = '__a=1&__d=dis';
  const fetchUrl = tab.url + (tab.url.includes('?') ? '&' : '?') + getParams;
  fetchWithTimeout(fetchUrl, { timeout: fetchTimeout }).then(data => {
    getCurrentTab((tabCurrent) => {
      if (tabCurrent?.url !== tab.url) {
        console.log('[IED] read json aborted because url changed');
        return;
      }
      console.log('[IED] read json success', JSON.stringify(data, null, 2));
      if (!data.items) {
        console.warn('[IED] read json got unexpected result!');
        return;
      }
      let imageVersions = data.items[0].image_versions2;
      let videoVersions = data.items[0].video_versions;
      let carouselMedia = data.items[0].carousel_media;
      if (carouselMedia) {
        let imageUrl, videoUrl;
        carouselMedia.forEach((media) => {
          imageUrl = media.image_versions2.candidates[0].url;
          videoUrl = media.video_versions ? media.video_versions[0].url : null;
          if (videoUrl) pushPic(videoUrl, 'video');
          else if (imageUrl) pushPic(imageUrl);
        });
        setDownloadIcon(tab, 'instagram', 'post', carouselMedia.length);
      } else if (videoVersions) {
        let videoUrl = videoVersions[0].url;
        if (videoUrl) {
          pushPic(videoUrl, 'video');
          setDownloadIcon(tab, 'instagram', 'post', 1);
        }
      } else if (imageVersions) {
        let imageUrl = imageVersions.candidates[0].url;
        if (imageUrl) {
          pushPic(imageUrl);
          setDownloadIcon(tab, 'instagram', 'post', 1);
        }
      }
    });
  }).catch(err => {
    // TODO FIXME read json got this: https://www.instagram.com/p/CdCRRjvBZS5/?__a=1
    // read json success {
    //   "message": "",
    //   "spam": true,
    //   "status": "fail"
    // }
    console.warn('[IED] read json error', err, typeof err);
    setTimeout(() => {
      detectMedia(tab, 'instagram');
    }, 1000);
  });
}

async function fetchWithTimeout(url, options = {}) {
  const { timeout = 8000 } = options;
  fetchController = new AbortController();
  const id = setTimeout(() => fetchController.abort(), timeout);
  const responseJson = await fetch(url, {
    ...options,
    signal: fetchController.signal  
  }).then(res => res.json());
  clearTimeout(id);
  return responseJson;
}

function analyzeTab() {
  getCurrentTab(analyze);
}

analyzeTab();