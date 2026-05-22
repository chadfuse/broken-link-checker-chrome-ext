let isScanning = false;
let currentConfig = {
  autoDetect: true,
  includeHeader: true,
  includeMain: true,
  includeFooter: true,
  includeSidebar: true,
  excludeSelectors: []
};

let scanResults = {
  total: 0,
  working: 0,
  broken: 0,
  redirected: 0,
  errors: 0
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SCAN_LINKS') {
    currentConfig = { ...currentConfig, ...message.config };
    startScan();
  } else if (message.action === 'STOP_SCAN') {
    stopScan();
  }
});

function sendToRuntime(message) {
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function sendUpdateToPopup(status, currentUrl, percent) {
  sendToRuntime({
    action: 'SCAN_PROGRESS',
    status,
    currentUrl,
    percent,
    total: scanResults.total,
    working: scanResults.working,
    broken: scanResults.broken,
    redirected: scanResults.redirected,
    errors: scanResults.errors
  });
}

function sendCompleteToPopup() {
  sendToRuntime({
    action: 'SCAN_COMPLETE',
    total: scanResults.total,
    working: scanResults.working,
    broken: scanResults.broken,
    redirected: scanResults.redirected,
    errors: scanResults.errors
  });
}

function sendStoppedToPopup() {
  sendToRuntime({ action: 'SCAN_STOPPED' });
}

function sendErrorToPopup(error) {
  sendToRuntime({ action: 'SCAN_ERROR', error });
}

function stopScan() {
  isScanning = false;
  sendStoppedToPopup();
}

function removeClasses(link) {
  link.classList.remove('blh-working', 'blh-broken', 'blh-redirect');
  delete link.dataset.brokenStatus;
}


function getSectionElements() {
  return [document.body];
}

function isLinkExcluded(link) {
  if (!currentConfig.excludeSelectors || currentConfig.excludeSelectors.length === 0) return false;
  for (const selector of currentConfig.excludeSelectors) {
    try {
      if (link.matches(selector)) return true;
      for (const el of document.querySelectorAll(selector)) {
        if (el.contains(link)) return true;
      }
    } catch (e) { /* invalid selector */ }
  }
  return false;
}

function isLinkInIncludedSection(link) {
  if (isLinkExcluded(link)) return false;
  return getSectionElements().some(el => el.contains(link) || el === link);
}


async function startScan() {
  if (isScanning) return;
  isScanning = true;

  scanResults = { total: 0, working: 0, broken: 0, redirected: 0, errors: 0 };

  sendUpdateToPopup('Starting scan...', '', 0);

  const allLinks = [...document.querySelectorAll('a[href]')];

  const links = allLinks.filter(link => {
    const href = link.href;
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
    return isLinkInIncludedSection(link);
  });

  scanResults.total = links.length;
  sendUpdateToPopup(`Scanning ${links.length} links...`, '', 0);

  if (links.length === 0) {
    sendUpdateToPopup('No links found', '', 0);
    isScanning = false;
    sendCompleteToPopup();
    return;
  }

  const total = links.length;
  const state = { completed: 0 };
  const tasks = links.map(link => () => checkOneLink(link, total, state));
  await runWithConcurrency(tasks, 12);

  if (isScanning) {
    sendUpdateToPopup('Scan complete!', '', 100);
    sendCompleteToPopup();
  }

  isScanning = false;
}

async function checkLink(url) {
  // Fetch directly from content script — avoids MV3 service worker idle issue
  // Content scripts have access to all URLs via host_permissions
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    // Try HEAD first
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      credentials: 'omit'
    });
    clearTimeout(timeout);
    return { status: response.status, redirected: response.redirected };
  } catch (headErr) {
    clearTimeout(timeout);
    // HEAD failed — try GET with no-cors (gives opaque response but confirms reachability)
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10000);
      const response2 = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller2.signal,
        credentials: 'omit',
        mode: 'no-cors'
      });
      clearTimeout(timeout2);
      // Opaque response means server responded — treat as working
      return { status: 200, redirected: false };
    } catch (getErr) {
      return { status: 0, redirected: false, networkError: true };
    }
  }
}

async function checkOneLink(link, total, state) {
  if (!isScanning) return;

  const href = link.href;
  removeClasses(link);

  try {
    sendUpdateToPopup('Scanning links...', href, (state.completed / total) * 100);

    const result = await checkLink(href);

    if (!isScanning) return;

    if (!result || result.networkError || result.status === 0) {
      link.classList.add('blh-broken');
      link.dataset.brokenStatus = 'ERR';
      scanResults.errors++;
    } else if (result.status >= 400) {
      link.classList.add('blh-broken');
      link.dataset.brokenStatus = result.status;
      scanResults.broken++;
    } else if (result.redirected) {
      link.classList.add('blh-redirect');
      link.dataset.brokenStatus = result.status;
      scanResults.redirected++;
    } else {
      link.classList.add('blh-working');
      link.dataset.brokenStatus = result.status;
      scanResults.working++;
    }

    sendUpdateToPopup('Scanning links...', href, ((state.completed + 1) / total) * 100);
  } catch (error) {
    if (!isScanning) return;
    link.classList.add('blh-broken');
    link.dataset.brokenStatus = 'ERR';
    scanResults.errors++;
  } finally {
    state.completed++;
  }
}

async function runWithConcurrency(tasks, concurrency) {
  const queue = [...tasks];
  const workers = Array.from({ length: concurrency }, () =>
    (async () => {
      while (queue.length > 0 && isScanning) {
        await queue.shift()();
      }
    })()
  );
  await Promise.all(workers);
}
