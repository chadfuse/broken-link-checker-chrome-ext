// Relay scan status messages from content script to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (['SCAN_PROGRESS', 'SCAN_COMPLETE', 'SCAN_STOPPED', 'SCAN_ERROR'].includes(message.action)) {
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
  }
});
