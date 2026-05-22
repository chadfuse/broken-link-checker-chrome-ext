// Test if content script is loading
console.log('Broken Link Highlighter: Content script loaded!');

let isScanning = false;
let currentConfig = {
  autoDetect: true,
  includeHeader: true,
  includeMain: true,
  includeFooter: true,
  includeSidebar: true,
  excludeSelectors: []
};

// Scan results tracking
let scanResults = {
  total: 0,
  working: 0,
  broken: 0,
  redirected: 0,
  errors: 0
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Broken Link Highlighter: Received message:', message);
  
  if (message.action === 'SCAN_LINKS') {
    console.log('Broken Link Highlighter: Received SCAN_LINKS with config:', message.config);
    currentConfig = { ...currentConfig, ...message.config };
    startScan();
  } else if (message.action === 'STOP_SCAN') {
    stopScan();
  } else if (message.action === 'GET_DETECTED_SECTIONS') {
    const sections = detectPageSections();
    sendResponse(sections);
    return true;
  }
});

function sendUpdateToPopup(status, currentUrl, percent) {
  try {
    chrome.runtime.sendMessage({
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
  } catch (error) {
    console.log('Broken Link Highlighter: Could not send update to popup (popup may be closed):', error);
  }
}

function sendCompleteToPopup() {
  try {
    chrome.runtime.sendMessage({
      action: 'SCAN_COMPLETE',
      total: scanResults.total,
      working: scanResults.working,
      broken: scanResults.broken,
      redirected: scanResults.redirected,
      errors: scanResults.errors
    });
  } catch (error) {
    console.log('Broken Link Highlighter: Could not send complete to popup (popup may be closed):', error);
  }
}

function sendStoppedToPopup() {
  try {
    chrome.runtime.sendMessage({
      action: 'SCAN_STOPPED'
    });
  } catch (error) {
    console.log('Broken Link Highlighter: Could not send stopped to popup (popup may be closed):', error);
  }
}

function sendErrorToPopup(error) {
  try {
    chrome.runtime.sendMessage({
      action: 'SCAN_ERROR',
      error
    });
  } catch (e) {
    console.log('Broken Link Highlighter: Could not send error to popup (popup may be closed):', e);
  }
}

function stopScan() {
  isScanning = false;
  sendStoppedToPopup();
}

function removeClasses(link) {
  link.classList.remove('blh-working', 'blh-broken', 'blh-redirect');
  delete link.dataset.brokenStatus;
}

function detectPageSections() {
  const sections = {
    header: [],
    main: [],
    footer: [],
    sidebar: []
  };

  // Semantic HTML5 elements (highest priority)
  const semanticHeader = document.querySelector('header');
  const semanticMain = document.querySelector('main');
  const semanticFooter = document.querySelector('footer');
  const semanticAside = document.querySelector('aside');

  if (semanticHeader) sections.header.push(semanticHeader);
  if (semanticMain) sections.main.push(semanticMain);
  if (semanticFooter) sections.footer.push(semanticFooter);
  if (semanticAside) sections.sidebar.push(semanticAside);

  // Common ID patterns
  const idPatterns = {
    header: ['#header', '#site-header', '#top', '#top-bar', '#nav', '#navigation', '#navbar'],
    main: ['#main', '#content', '#primary', '#main-content', '#page-content'],
    footer: ['#footer', '#site-footer', '#bottom', '#site-info', '#colophon'],
    sidebar: ['#sidebar', '#side-bar', '#secondary', '#widgets', '#widget-area']
  };

  // Common class patterns
  const classPatterns = {
    header: ['.header', '.site-header', '.top', '.top-bar', '.nav', '.navigation', '.navbar', '.menu'],
    main: ['.main', '.content', '.primary', '.main-content', '.page-content', '.article', '.post'],
    footer: ['.footer', '.site-footer', '.bottom', '.site-info', '.colophon'],
    sidebar: ['.sidebar', '.side-bar', '.secondary', '.widgets', '.widget-area', '.widget']
  };

  // Find elements by ID patterns
  Object.entries(idPatterns).forEach(([section, patterns]) => {
    patterns.forEach(pattern => {
      const element = document.querySelector(pattern);
      if (element && !sections[section].includes(element)) {
        sections[section].push(element);
      }
    });
  });

  // Find elements by class patterns
  Object.entries(classPatterns).forEach(([section, patterns]) => {
    patterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      elements.forEach(element => {
        if (!sections[section].includes(element)) {
          sections[section].push(element);
        }
      });
    });
  });

  // Heuristic detection for header
  if (sections.header.length === 0) {
    const headerCandidates = document.querySelectorAll('div[id*="header"], div[class*="header"], div[id*="top"], div[class*="top"]');
    const topMostElement = Array.from(headerCandidates).find(el => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.3; // In top 30% of viewport
    });
    if (topMostElement) sections.header.push(topMostElement);
  }

  // Heuristic detection for footer
  if (sections.footer.length === 0) {
    const footerCandidates = document.querySelectorAll('div[id*="footer"], div[class*="footer"], div[id*="bottom"], div[class*="bottom"]');
    const bottomMostElement = Array.from(footerCandidates).find(el => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > window.innerHeight * 0.7; // In bottom 30% of viewport
    });
    if (bottomMostElement) sections.footer.push(bottomMostElement);
  }

  // Heuristic detection for sidebar (elements with float or position that appear alongside main content)
  if (sections.sidebar.length === 0) {
    const sidebarCandidates = Array.from(document.querySelectorAll('div, aside, nav')).filter(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (style.float === 'left' || style.float === 'right' || 
              style.position === 'absolute' || style.position === 'fixed') &&
             rect.width < 400 && // Typically narrower than main content
             rect.height > 100; // Substantial height
    });
    if (sidebarCandidates.length > 0) sections.sidebar.push(sidebarCandidates[0]);
  }

  return sections;
}

function getSelectorsToScan() {
  const selectors = [];
  
  if (currentConfig.autoDetect) {
    // Auto-detect mode: use detected sections
    const detectedSections = detectPageSections();

    if (currentConfig.includeHeader && detectedSections.header.length > 0) {
      const headerSelectors = detectedSections.header.map(el => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ')[0]}`;
        return el.tagName.toLowerCase();
      });
      selectors.push(...headerSelectors);
    }

    if (currentConfig.includeMain && detectedSections.main.length > 0) {
      const mainSelectors = detectedSections.main.map(el => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ')[0]}`;
        return el.tagName.toLowerCase();
      });
      selectors.push(...mainSelectors);
    }

    if (currentConfig.includeFooter && detectedSections.footer.length > 0) {
      const footerSelectors = detectedSections.footer.map(el => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ')[0]}`;
        return el.tagName.toLowerCase();
      });
      selectors.push(...footerSelectors);
    }

    if (currentConfig.includeSidebar && detectedSections.sidebar.length > 0) {
      const sidebarSelectors = detectedSections.sidebar.map(el => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ')[0]}`;
        return el.tagName.toLowerCase();
      });
      selectors.push(...sidebarSelectors);
    }
  } else {
    // Manual mode: use predefined patterns
    if (currentConfig.includeHeader) {
      selectors.push('header', '.header', '.site-header', '#header', '.top-bar', '.navbar');
    }

    if (currentConfig.includeMain) {
      selectors.push('main', '.main', '.content', '#content', '.article', '.post', '.page-content');
    }

    if (currentConfig.includeFooter) {
      selectors.push('footer', '.footer', '.site-footer', '#footer', '.bottom', '.site-info');
    }

    if (currentConfig.includeSidebar) {
      selectors.push('aside', '.sidebar', '.side-bar', '#sidebar', '.widget-area', '.sidebar-content');
    }
  }

  // If no sections detected, fall back to scanning the entire page
  if (selectors.length === 0) {
    return 'body';
  }

  return selectors.join(', ');
}

function isLinkExcluded(link) {
  // Check if link matches any exclude selector
  if (currentConfig.excludeSelectors && currentConfig.excludeSelectors.length > 0) {
    // Check if the link itself matches any exclude selector
    for (const selector of currentConfig.excludeSelectors) {
      try {
        if (link.matches && link.matches(selector)) {
          console.log('Broken Link Highlighter: Link excluded by direct match:', selector, link);
          return true;
        }
      } catch (e) {
        // Invalid selector, skip
        continue;
      }
    }
    
    // Check if link is inside any excluded element
    for (const selector of currentConfig.excludeSelectors) {
      try {
        const excludedElements = document.querySelectorAll(selector);
        
        for (const excludedElement of excludedElements) {
          if (excludedElement.contains(link)) {
            console.log('Broken Link Highlighter: Link excluded by parent:', selector, link);
            return true;
          }
        }
      } catch (e) {
        // Invalid selector, skip
        continue;
      }
    }
  }
  
  return false;
}

function isLinkInIncludedSection(link) {
  // First check if link is excluded
  if (isLinkExcluded(link)) {
    return false;
  }

  const selectors = getSelectorsToScan();
  const includedElements = document.querySelectorAll(selectors);

  return Array.from(includedElements).some(element =>
    element.contains(link) || element === link
  );
}

// Debug function to check a specific link
function debugSpecificLink(linkHref) {
  const link = document.querySelector(`a[href="${linkHref}"]`);
  if (!link) {
    console.log('Broken Link Highlighter: Link not found:', linkHref);
    return;
  }
  
  console.log('Broken Link Highlighter: Debugging link:', link);
  console.log('Broken Link Highlighter: Link text:', link.textContent);
  console.log('Broken Link Highlighter: Link href:', link.href);
  
  // Check if excluded
  const excluded = isLinkExcluded(link);
  console.log('Broken Link Highlighter: Is excluded:', excluded);
  
  // Check if in included section
  const included = isLinkInIncludedSection(link);
  console.log('Broken Link Highlighter: Is in included section:', included);
  
  // Show selectors
  const selectors = getSelectorsToScan();
  console.log('Broken Link Highlighter: Current selectors:', selectors);
  console.log('Broken Link Highlighter: Exclude selectors:', currentConfig.excludeSelectors);
}

async function startScan() {
  if (isScanning) return;
  isScanning = true;

  // Reset scan results
  scanResults = {
    total: 0,
    working: 0,
    broken: 0,
    redirected: 0,
    errors: 0
  };

  console.log('Broken Link Highlighter: Starting scan with config:', currentConfig);
  sendUpdateToPopup('Starting scan...', '', 0);

  const allLinks = [...document.querySelectorAll('a[href]')];
  console.log('Broken Link Highlighter: Found total links:', allLinks.length);
  
  const links = allLinks.filter(link => {
    const href = link.href;
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return false;
    }
    return isLinkInIncludedSection(link);
  });

  console.log('Broken Link Highlighter: Links to scan:', links.length);
  scanResults.total = links.length;
  sendUpdateToPopup(`Scanning ${links.length} links...`, '', 0);
  
  const total = links.length;
  const state = { completed: 0 };

  if (total === 0) {
    sendUpdateToPopup('No links found in selected sections', '', 0);
    isScanning = false;
    sendCompleteToPopup();
    return;
  }

  const tasks = links.map(link => () => checkOneLink(link, total, state));

  await runWithConcurrency(tasks, 12);

  if (isScanning) {
    sendUpdateToPopup('Scan complete!', '', 100);
    sendCompleteToPopup();
  }

  isScanning = false;
}

async function checkOneLink(link, total, state) {
  if (!isScanning) return;

  const href = link.href;
  removeClasses(link);

  try {
    const percent = (total === 0 ? 0 : (state.completed / total) * 100);
    sendUpdateToPopup('Scanning links...', href, percent);

    console.log('Broken Link Highlighter: Checking link:', href);
    const result = await chrome.runtime.sendMessage({
      action: 'CHECK_LINK',
      url: href
    });

    console.log('Broken Link Highlighter: Link result:', href, result);

    if (!isScanning) return;

    link.dataset.brokenStatus = result.status;

    if (result.status >= 400) {
      link.classList.add('blh-broken');
      scanResults.broken++;
      console.log('Broken Link Highlighter: Added blh-broken class to:', href);
    } else if (result.redirected) {
      link.classList.add('blh-redirect');
      scanResults.redirected++;
      console.log('Broken Link Highlighter: Added blh-redirect class to:', href);
    } else {
      link.classList.add('blh-working');
      scanResults.working++;
      console.log('Broken Link Highlighter: Added blh-working class to:', href);
    }
    
    // Send update with current results
    const currentPercent = (total === 0 ? 0 : ((state.completed + 1) / total) * 100);
    sendUpdateToPopup('Scanning links...', href, currentPercent);
  } catch (error) {
    console.error('Broken Link Highlighter: Error checking link:', href, error);
    if (!isScanning) return;
    link.classList.add('blh-broken');
    link.dataset.brokenStatus = 'ERR';
    scanResults.errors++;
    sendErrorToPopup('Error checking link: ' + href);
  } finally {
    state.completed++;
  }
}

async function runWithConcurrency(tasks, concurrency) {
  const queue = [...tasks];
  const workers = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (queue.length > 0 && isScanning) {
        const task = queue.shift();
        await task();
      }
    })());
  }

  await Promise.all(workers);
}

console.log('Broken Link Highlighter: Content script setup complete');