var isReady = false;
var analyzeInterval;
var currentTabID;
var currentURL;
var pics = [];

chrome.action.onClicked.addListener(onIconClick);
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("on action", request, sender);
  let { action } = request;
  let response = {ok: true};
  switch (action) {
    case 'clickIcon':
      getCurrentTab(onIconClick);
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
  if (currentTabID != tabId && info.status === 'complete' && /^http/.test(tab.url)) {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./foreground.js"]
    });
    console.log("[IED] INJECTED THE FOREGROUND SCRIPT.");
    currentTabID = tabId;
  }
  if (tab.selected && tab.status !== 'unloaded' && currentURL != tab.url) {
    analyzeTab();
  }
});

async function getCurrentTab(todo) {
  let queryOptions = { active: true, currentWindow: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  todo(tab);
}

function onIconClick(tab) {
  if (isReady) {
    console.log('[IED] download from', tab, pics);
    chrome.tabs.sendMessage(+tab.id, { action: 'savePics', pics: pics });
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

function analyze(tab) {
  console.log("[IED] analyze tab", tab);
  isReady = false;

  const { url, status } = tab;
  const tabId = tab.id;

  chrome.action.setTitle({title: 'Open a Instagram post to download its photos', tabId});
  chrome.action.setBadgeText({'text': ''});
  generateIcons(tabId, 'disabled');

  if (url) {
    const isInstagram = url.match(/https:\/\/[\w]+\.instagram\.com/);
    const isPostPage = isInstagram?.length && url.replace(isInstagram, '').startsWith('/p/');
    console.log("[IED] is instagram", isInstagram?.length);
    console.log("[IED] is post page", isPostPage);
    if (currentURL != url) {
      clearInterval(analyzeInterval);
      analyzeInterval = null;
      pics.length = 0;
    }
    currentURL = url;
  
    if (isPostPage) {
      if (status == "complete") {
        console.log("[IED] load post complete");
        if (!!!analyzeInterval) analyzeInterval = setInterval(() => {
          console.log("[IED] counting pics ...");
          chrome.tabs.sendMessage(tabId, { action: 'detectPics', pics: pics }, function(response) {
            let error = chrome.runtime.lastError;
            if (error) {
              console.log('[IED] action error', error.message);
            } else {
              const detected = response?.result || [];
              detected.forEach((pic) => {
                if (!pics.includes(pic)) pics.push(pic);
              });
              const picCount = pics.length;
              console.log("[IED] pics count", picCount);
              if (picCount) {
                chrome.action.setTitle({title: `Download ${picCount} photos (or press Ctrl+S)`, tabId});
                chrome.action.setBadgeText({'text': `${picCount}`});
                chrome.action.setBadgeBackgroundColor({'color': '#333333'});
                generateIcons(tabId, 'icon');
                isReady = true;
              }
            }
          });
        }, 1000);
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