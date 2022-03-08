var isReady = false;
var analyzeInterval;
var currentTab;
var pics = [];
var picTotal = 0;

chrome.action.onClicked.addListener(onIconClick);

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
  return /https:\/\/[\w]+\.instagram\.com/.test(url);
}
function isURLPostPage(url) {
  return /https:\/\/[\w]+\.instagram\.com\/p\//.test(url);
}

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

function onIconClick() {
  console.log('[IED] onIconClick', currentTab, isReady);
  if (!!currentTab && isReady) {
    console.log('[IED] download from', currentTab, pics);
    chrome.scripting.executeScript({
      target: {tabId: currentTab.id},
      func: downloadAll,
      args: [pics]
    });
  } else {
    console.log('[IED] tab not ready');
    // alert("No image to download. Make sure you open a Instagram post page in current tab.");
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
  if (!!!tab) return;
  
  const { url, status, selected, active } = tab;
  const tabId = tab.id;
  
  chrome.action.setTitle({title: 'Open a Instagram post to download its photos', tabId});
  chrome.action.setBadgeText({'text': ''});
  generateIcons(tabId, 'disabled');
  resetPics();
  isReady = false;

  if (url && selected && active) {
    const isInstagram = isURLInstagram(url);
    const isPostPage = isURLPostPage(url);
    console.log("[IED] is instagram", isInstagram);
    console.log("[IED] is post page", isPostPage);
    
    if (isPostPage) {
      if (status === "complete") {
        console.log("[IED] load post complete");
        currentTab = tab;
        if (!!!analyzeInterval) analyzeInterval = setInterval(() => {
          console.log("[IED] counting pics ...");
          chrome.tabs.sendMessage(tabId, { action: 'detectPics', pics: pics }, function(response) {
            let error = chrome.runtime.lastError;
            if (error) {
              console.log('[IED] action error', error.message);
            } else {
              const detected = response?.result || [];
              picTotal = response?.total || 0;
              detected.forEach((pic) => {
                if (!pics.includes(pic)) pics.push(pic);
              });
              const picCount = pics.length;
              console.log("[IED] pics count", picCount, '/', picTotal);
              if (picCount) {
                chrome.action.setTitle({title: `Download all ${picCount} photos in 1-click`, tabId});
                chrome.action.setBadgeText({'text': `${picCount}`});
                chrome.action.setBadgeBackgroundColor({'color': '#333333'});
                generateIcons(tabId, 'icon');
                isReady = true;
                if (picCount == picTotal) {
                  console.log("[IED] pics detection completed!");
                  stopCounting();
                }
              }
            }
          });
        }, 500);
      } else {
        chrome.action.setTitle({title: 'Please wait ...', tabId});
      }
    }
  }
};

function analyzeTab() {
  getCurrentTab(analyze);
}

analyzeTab();