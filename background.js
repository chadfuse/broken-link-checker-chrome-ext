chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CHECK_LINK') {
    console.log('Background: Checking link:', message.url);
    checkLink(message.url)
      .then(result => {
        console.log('Background: Link result:', message.url, result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Background: Error checking link:', message.url, error);
        sendResponse({ status: 999, redirected: false });
      });
    return true;
  }
});

async function checkLink(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    console.log('Background: Fetching:', url);
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);
    const result = {
      status: response.status,
      redirected: response.redirected
    };
    console.log('Background: Fetch response:', url, result);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    console.error('Background: Fetch error:', url, error);
    return {
      status: 999,
      redirected: false
    };
  }
}