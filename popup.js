const scanBtn = document.getElementById('scanBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const excludeSelectors = document.getElementById('excludeSelectors');

const scanProgress = document.getElementById('scanProgress');
const progressStatus = document.getElementById('progressStatus');
const progressCurrent = document.getElementById('progressCurrent');
const progressPercent = document.getElementById('progressPercent');
const progressBar = document.getElementById('progressBar');

const scanResults = document.getElementById('scanResults');
const resultTotal = document.getElementById('resultTotal');
const resultWorking = document.getElementById('resultWorking');
const resultBroken = document.getElementById('resultBroken');
const resultRedirected = document.getElementById('resultRedirected');
const resultErrors = document.getElementById('resultErrors');

let isScanning = false;

const defaultSettings = {
  autoDetect: true,
  includeHeader: true,
  includeMain: true,
  includeFooter: true,
  includeSidebar: true,
  excludeSelectors: ''
};

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('scanSettings');
    const settings = { ...defaultSettings, ...result.scanSettings };
    excludeSelectors.value = settings.excludeSelectors || '';
  } catch (error) {
    excludeSelectors.value = defaultSettings.excludeSelectors;
  }
}

async function saveSettings() {
  const settings = {
    autoDetect: true,
    includeHeader: true,
    includeMain: true,
    includeFooter: true,
    includeSidebar: true,
    excludeSelectors: excludeSelectors.value
  };

  try {
    await chrome.storage.sync.set({ scanSettings: settings });
    saveStatus.classList.add('show');
    setTimeout(() => saveStatus.classList.remove('show'), 2000);
  } catch (error) {
    // Silent fail — settings not critical
  }
}

async function sendAction(action, config = {}) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      updateProgress('Error: No active tab found', '', 0);
      stopScanning();
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action, config }, () => {
      if (chrome.runtime.lastError && action === 'SCAN_LINKS') {
        updateProgress('Error: Could not communicate with page', '', 0);
        stopScanning();
      }
    });
  } catch (error) {
    if (action === 'SCAN_LINKS') {
      updateProgress('Error: Could not access page', '', 0);
      stopScanning();
    }
  }
}

function getScanConfig() {
  return {
    autoDetect: true,
    includeHeader: true,
    includeMain: true,
    includeFooter: true,
    includeSidebar: true,
    excludeSelectors: excludeSelectors.value.split(',').map(s => s.trim()).filter(s => s)
  };
}

function startScanning() {
  isScanning = true;
  scanBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  scanProgress.classList.add('active');
  scanResults.classList.remove('active');
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

scanBtn.addEventListener('click', () => {
  startScanning();
  sendAction('SCAN_LINKS', getScanConfig());
});

stopBtn.addEventListener('click', () => {
  sendAction('STOP_SCAN');
  stopScanning();
});

saveBtn.addEventListener('click', saveSettings);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SCAN_PROGRESS') {
    updateProgress(message.status, message.currentUrl, message.percent);
  } else if (message.action === 'SCAN_COMPLETE') {
    updateResults(message.total, message.working, message.broken, message.redirected, message.errors);
    stopScanning();
  }
  sendResponse({ received: true });
});

loadSettings();
