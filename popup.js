console.log('Broken Link Highlighter: Popup script loaded!');

const scanBtn = document.getElementById('scanBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const excludeSelectors = document.getElementById('excludeSelectors');

// Progress elements
const scanProgress = document.getElementById('scanProgress');
const progressStatus = document.getElementById('progressStatus');
const progressCurrent = document.getElementById('progressCurrent');
const progressPercent = document.getElementById('progressPercent');
const progressBar = document.getElementById('progressBar');

// Results elements
const scanResults = document.getElementById('scanResults');
const resultTotal = document.getElementById('resultTotal');
const resultWorking = document.getElementById('resultWorking');
const resultBroken = document.getElementById('resultBroken');
const resultRedirected = document.getElementById('resultRedirected');
const resultErrors = document.getElementById('resultErrors');

let isScanning = false;

// Default settings
const defaultSettings = {
  autoDetect: true,
  includeHeader: true,
  includeMain: true,
  includeFooter: true,
  includeSidebar: true,
  excludeSelectors: ''
};

// Load saved settings
async function loadSettings() {
  try {
    console.log('Broken Link Highlighter: Loading settings...');
    const result = await chrome.storage.sync.get('scanSettings');
    console.log('Broken Link Highlighter: Loaded result:', result);
    const settings = { ...defaultSettings, ...result.scanSettings };
    console.log('Broken Link Highlighter: Final settings:', settings);
    
    excludeSelectors.value = settings.excludeSelectors || '';
    
    console.log('Broken Link Highlighter: Settings applied to UI');
  } catch (error) {
    console.error('Broken Link Highlighter: Could not load settings:', error);
    // Use default settings
    excludeSelectors.value = defaultSettings.excludeSelectors;
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    autoDetect: true,
    includeHeader: true,
    includeMain: true,
    includeFooter: true,
    includeSidebar: true,
    excludeSelectors: excludeSelectors.value
  };
  
  console.log('Broken Link Highlighter: Saving settings:', settings);
  
  try {
    await chrome.storage.sync.set({ scanSettings: settings });
    console.log('Broken Link Highlighter: Settings saved successfully');
    
    // Show success message
    saveStatus.classList.add('show');
    setTimeout(() => {
      saveStatus.classList.remove('show');
    }, 2000);
  } catch (error) {
    console.error('Broken Link Highlighter: Could not save settings:', error);
  }
}

async function sendAction(action, config = {}) {
  console.log('Broken Link Highlighter: Sending action:', action, config);
  
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    console.log('Broken Link Highlighter: Sending to tab:', tab.id);
    
    chrome.tabs.sendMessage(tab.id, {
      action,
      config
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Broken Link Highlighter: Error sending message:', chrome.runtime.lastError);
        if (action === 'SCAN_LINKS') {
          updateProgress('Error: Could not communicate with page', '', 0);
          stopScanning();
        }
      } else {
        console.log('Broken Link Highlighter: Message sent successfully');
      }
    });
  } catch (error) {
    console.error('Broken Link Highlighter: Error in sendAction:', error);
    if (action === 'SCAN_LINKS') {
      updateProgress('Error: Could not access page', '', 0);
      stopScanning();
    }
  }
}

function getScanConfig() {
  const excludeSelectorsValue = excludeSelectors.value
    .split(',')
    .map(s => s.trim())
    .filter(s => s);

  const config = {
    autoDetect: true,
    includeHeader: true,
    includeMain: true,
    includeFooter: true,
    includeSidebar: true,
    excludeSelectors: excludeSelectorsValue
  };
  
  console.log('Broken Link Highlighter: Scan config:', config);
  return config;
}

function startScanning() {
  console.log('Broken Link Highlighter: Starting scanning...');
  isScanning = true;
  scanBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  scanProgress.classList.add('active');
  scanResults.classList.remove('active');
  
  console.log('Broken Link Highlighter: Progress element:', scanProgress);
  console.log('Broken Link Highlighter: Progress classes:', scanProgress.className);
  
  // Reset progress
  updateProgress('Starting scan...', '', 0);
  updateResults(0, 0, 0, 0, 0);
}

function stopScanning() {
  isScanning = false;
  scanBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  scanProgress.classList.remove('active');
  scanResults.classList.add('active');
}

function updateProgress(status, currentUrl, percent) {
  console.log('Broken Link Highlighter: Updating progress:', status, Math.round(percent) + '%');
  if (progressStatus) progressStatus.textContent = status;
  if (progressCurrent) progressCurrent.textContent = currentUrl || '';
  if (progressPercent) progressPercent.textContent = Math.round(percent) + '%';
  if (progressBar) progressBar.style.width = percent + '%';
}

function updateResults(total, working, broken, redirected, errors) {
  if (resultTotal) resultTotal.textContent = total;
  if (resultWorking) resultWorking.textContent = working;
  if (resultBroken) resultBroken.textContent = broken;
  if (resultRedirected) resultRedirected.textContent = redirected;
  if (resultErrors) resultErrors.textContent = errors;
}

// Event listeners
scanBtn.addEventListener('click', () => {
  const config = getScanConfig();
  startScanning();
  sendAction('SCAN_LINKS', config);
});

stopBtn.addEventListener('click', () => {
  sendAction('STOP_SCAN');
  stopScanning();
});

saveBtn.addEventListener('click', saveSettings);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Broken Link Highlighter: Received message:', message);
  
  if (message.action === 'SCAN_PROGRESS') {
    updateProgress(message.status, message.currentUrl, message.percent);
  } else if (message.action === 'SCAN_COMPLETE') {
    updateResults(message.total, message.working, message.broken, message.redirected, message.errors);
    stopScanning();
  }
  
  sendResponse({ received: true });
});

// Initialize
loadSettings();

// Debug: Check if progress elements exist
console.log('Broken Link Highlighter: Progress elements debug:');
console.log('- scanProgress:', scanProgress);
console.log('- progressStatus:', progressStatus);
console.log('- progressCurrent:', progressCurrent);
console.log('- progressPercent:', progressPercent);
console.log('- progressBar:', progressBar);

if (scanProgress) {
  console.log('- Progress bar classes:', scanProgress.className);
  console.log('- Progress bar display:', window.getComputedStyle(scanProgress).display);
}