'use strict';

const body = document.getElementById("body");
const content = document.getElementById("content");
const text = document.getElementById("text");
const btnBulkStart = document.getElementById("btn-bulk-start");
const btnBulkStop = document.getElementById("btn-bulk-stop");
const btnDownload = document.getElementById("btn-download");
const btnDownloadAll = document.getElementById("btn-download-all");
const btnCloseTabs = document.getElementById("btn-close-tabs");

var mediaTabs = [];

function sendAction(action, callback = () => {}) {
  console.log('sending action', action);
  chrome.runtime.sendMessage({action}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) return console.error('action error:', action, error.message);
    console.log('action response:', action, response);
    callback(response);
  });
}

btnBulkStart.addEventListener('click', () => sendAction('bulkDownload', window.close));
btnBulkStop.addEventListener('click', () => {
  if (confirm('Are you sure you want to stop the operation now?')) sendAction('escapeKey', window.close);
});
btnDownload.addEventListener('click', () => sendAction('showPopup', window.close));
btnDownloadAll.addEventListener('click', downloadTabs);
btnCloseTabs.addEventListener('click', e => {
  mediaTabs.forEach((tab) => {
    try {
      chrome.tabs.remove(+tab.id);
    } catch(err) {
    }
  });
  mediaTabs.length = 0;
  window.close();
});

sendAction('handshake', (response) => {
  if (!response.ok) window.close();
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('got message', message);
  let { action, site, pics, vids, tabs, isBulkAvaiable, isBulkOngoing } = message;
  let mediaCount = pics?.length + vids?.length;
  let response = {'ok': true};
  switch (action) {
    case 'mediaTabs':
      if (!tabs.length) break;
      mediaTabs = tabs;
      btnDownloadAll.querySelector('span').innerText = tabs.length;
      btnDownloadAll.classList.add('show');
      text.innerHTML = `
      <h1>Opened Media Detected!</h1>
      <h3>You can download all ${tabs.length} detected photo & videos from tabs at once.</h3>
      `;
      break;
    case 'handshake':
      if (mediaCount) {
        sendAction('showPopup', window.close);
        break;
      }
      if (isBulkOngoing) {
        btnBulkStop.classList.add('show');
        text.innerHTML = `
        <h1>Bulk Download is On-Going!</h1>
        <h3>You can stop anytime by clicking the button below.</h3>
        `;
      } else if (isBulkAvaiable) {
        btnBulkStart.classList.add('show');
        text.innerHTML = `
        <h1>Bulk Download Available!</h1>
        <h3>You can download all photo & videos in this page.</h3>
        `;
      } else {
        text.innerHTML = `
        <h1>Social Media Easy Download</h1>
        <h3>Seems like there's nothing here, thanks for using me! :)</h3>
        `;
      }
      setTimeout(() => {
        body.classList.remove('loading');
      }, 500);
      break;
  }
  sendResponse(response);
});

function downloadTabs() {
  mediaTabs.forEach(tab => {
    const a = document.createElement("a");
    a.href = tab.url;
    // a.href = tab.url + (tab.url.includes('?') ? '&' : '?') + 'dl=1';
    // a.target = '_blank'; // is it needed?
    a.download = tab.url.split("/").pop().split('?')[0];
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  text.innerHTML = `
        <h1>${mediaTabs.length} Media Downloaded!</h1>
        <h3>All opened media has beed downloaded. Now you can close the tabs.</h3>
        `;
  btnDownloadAll.classList.remove('show');
  btnCloseTabs.classList.add('show');
}