const DEFAULT_IMPORT_ENDPOINT = 'https://carrier.superdispatch.com/api/codex/import-load';

function getConfig() {
  return chrome.storage.sync.get({
    importEndpoint: DEFAULT_IMPORT_ENDPOINT,
    apiToken: ''
  });
}

function isSuperDispatchHost(urlValue) {
  try {
    const endpoint = new URL(urlValue);
    return /(^|\.)superdispatch\.com$/i.test(endpoint.hostname);
  } catch {
    return false;
  }
}

async function sendImport(payload) {
  const { importEndpoint, apiToken } = await getConfig();

  if (!importEndpoint) {
    throw new Error('Missing import endpoint. Configure extension options first.');
  }

  const isSuperDispatchEndpoint = isSuperDispatchHost(importEndpoint);

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiToken && !isSuperDispatchEndpoint) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  if (apiToken && isSuperDispatchEndpoint) {
    headers['X-SD-Token-Ignored'] = 'true';
  }

  const response = await fetch(importEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }

  return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'IMPORT_LOAD') {
    return false;
  }

  sendImport(message.payload)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
