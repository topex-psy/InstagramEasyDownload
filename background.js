var isReady = false;
var analyzeInterval;
var pics = [];
var picTotal = 0;
var picNext = true;
var bulkDownload;
var currentTab;

chrome.action.onClicked.addListener(onIconClick);
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("[IED] action from foreground", request, sender);
  let { action } = request;
  let response = {ok: true};
  switch (action) {
    case 'escapeKey':
      getCurrentTab(stopBulkDownload);
      break;
  }
  sendResponse({action, ...response});
});
chrome.tabs.onActivated.addListener(function(info) {
  console.log('[IED] tab activated', info);
  analyzeTab();
});

// try {
  chrome.tabs.onUpdated.addListener(async function(tabId, info, tab) {
    console.log('[IED] tab updated', tabId, tab, info, isURLInstagram(tab.url));
    if (tab.selected && tab.status !== 'unloaded') {
      console.log('[IED] tab will analyze', tab.selected, tab.status, tab.url);
      analyze(tab);
    }
  });
// } catch(err) {
//   console.log('[IED] tab addListener error', err);
// }

async function getCurrentTab(todo) {
  let queryOptions = { active: true, currentWindow: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  todo(tab);
}

function isURLInstagram(url) {
  return url && /https:\/\/[\w]+\.instagram\.com/.test(url);
}
function isURLPostPage(url) {
  return url && /https:\/\/[\w]+\.instagram\.com\/p\//.test(url);
}
function downloadAll(pics) {
  try {
    pics.forEach(url => {
      // alt 1
      const a = document.createElement("a");
      a.href = url;
      a.target = '_blank';
      a.download = url.split("/").pop();
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      // alt 2
      // let popup = window.open(url);
      // popup.blur();
      // window.focus();
    });
    return true;
  } catch(err) {
    return false;
  }
}

function onIconClick() {
  console.log('[IED] onIconClick', currentTab, isReady);
  if (!!!currentTab || !isReady) {
    console.log('[IED] tab not ready');
    analyzeTab();
    return;
  }
  const { url } = currentTab;
  const isInstagram = isURLInstagram(url);
  const isPostPage = isURLPostPage(url);
  if (isPostPage) {
    console.log('[IED] download photos from', currentTab, pics);
    chrome.scripting.executeScript({
      target: {tabId: currentTab.id},
      func: downloadAll,
      args: [pics]
    });
  } else if (isInstagram) {
    if (bulkDownload == currentTab.id) {
      bulkDownload = null;
      analyzeTab();
      return;
    }
    chrome.tabs.sendMessage(currentTab.id, { action: 'bulkDownload' }, function(response) {
      let error = chrome.runtime.lastError;
      if (error) {
        console.log('[IED] bulkDownload error:', error.message);
      } else if (response?.result) {
        bulkDownload = currentTab.id;
      }
    });
  } else {
    console.log('[IED] tab is not instagram');
    analyzeTab();
  }
}

function generateIcons(tabId, name) {
  console.log('[IED] set action icon', tabId, name);
  chrome.action.setIcon({tabId, path: {
    "16": "icons/" + name + "16.png",
    "24": "icons/" + name + "24.png",
    "32": "icons/" + name + "32.png"
  }});
  isReady = name == 'icon';
  console.log('[IED] isReady', isReady);
}

function stopBulkDownload(tab) {
  if (bulkDownload == tab.id) bulkDownload = null;
}

function stopCounting() {
  clearInterval(analyzeInterval);
  analyzeInterval = null;
}

function resetPics() {
  stopCounting();
  pics.length = 0;
}

function analyze(tab) {
  console.log("[IED] analyze tab", tab);
  if (!!!tab || !tab.selected || !tab.active) return;
  
  const { url, status } = tab;
  const isInstagram = isURLInstagram(url);
  const isPostPage = isURLPostPage(url);
  const tabId = tab.id;

  console.log("[IED] is instagram", isInstagram, status);
  console.log("[IED] is post page", isPostPage);
  currentTab = tab;
  resetPics();

  if (!isInstagram || !!!url.split('instagram.com/').pop()) {
    chrome.action.setTitle({title: 'Open a Instagram post to download its photos or video', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, 'disabled');
    return;
  }

  if (status !== "complete") {
    chrome.action.setTitle({title: 'Loading content. Please wait ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, 'disabled');
    return;
  }
  
  console.log("[IED] load tab complete");

  if (isPostPage) {
    if (!!!analyzeInterval) analyzeInterval = setInterval(() => {
      console.log("[IED] counting pics ...");
      chrome.tabs.sendMessage(tabId, { action: 'detectPics', pics: pics, next: picNext }, function(response) {
        let error = chrome.runtime.lastError;
        if (error) {
          console.log('[IED] detectPics error:', error.message);
        } else {
          if (response?.video) {
            detectVideo(tab);
            stopCounting();
          } else {
            picTotal = response?.total || 0;
            picNext = response?.next || true;
            const detected = response?.result || [];
            detected.forEach((pic) => {
              if (!pics.includes(pic)) pics.push(pic);
            });
            setDownloadIcon(tab, 'photos', pics.length, picTotal);
          }
        }
      });
    }, 250);
    chrome.action.setTitle({title: 'Counting photos. Please wait ...', tabId});
    chrome.action.setBadgeText({'text': ''});
    generateIcons(tabId, 'disabled');
  } else if (bulkDownload == tabId) {
    chrome.action.setTitle({title: 'Cancel photos bulk download operation', tabId});
    chrome.action.setBadgeBackgroundColor({'color': '#a1183d'});
    chrome.action.setBadgeText({'text': 'Stop'});
    generateIcons(tabId, 'icon');
  } else {
    chrome.action.setTitle({title: 'Bulk download / Open a post to download its photos in 1-click', tabId});
    chrome.action.setBadgeBackgroundColor({'color': '#333333'});
    chrome.action.setBadgeText({'text': 'All'});
    generateIcons(tabId, 'icon');
  }
};

function setDownloadIcon(tab, type, picCount, picTotal) {
  console.log("[IED] detection count", picCount, '/', picTotal);
  if (!picCount) return;
  chrome.action.setTitle({title: `Download ${picCount > 1 ? 'all ' : ''}${picCount} ${type} in 1-click`, tabId: tab.id});
  chrome.action.setBadgeBackgroundColor({'color': '#333333'});
  chrome.action.setBadgeText({'text': `${picCount}`});
  generateIcons(tab.id, 'icon');
  if (picCount == picTotal) {
    console.log("[IED] detection completed!");
    stopCounting();
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

function detectVideo(tab) {
  if (!isURLPostPage(tab.url)) return;
  fetch(tab.url + '?__a=1').then(res => res.json()).then(data => {
    console.log('[IED] read json success', JSON.stringify(data, null, 2));
    let videoVersions = data.items[0].video_versions;
    let videoUrl = videoVersions ? videoVersions[0].url : null;
    if (videoUrl && !pics.includes(videoUrl)) {
      pics.push(videoUrl);
      setDownloadIcon(tab, 'video', 1, 1);
    }
  }).catch(err => {
    console.log('[IED] read json error', err);
  });
}

function analyzeTab() {
  getCurrentTab(analyze);
}

analyzeTab();