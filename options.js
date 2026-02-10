const statusNode = document.getElementById('status');
const importEndpointNode = document.getElementById('importEndpoint');
const apiTokenNode = document.getElementById('apiToken');
const saveButtonNode = document.getElementById('saveButton');

const DEFAULT_IMPORT_ENDPOINT = 'https://carrier.superdispatch.com/api/codex/import-load';

function showStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? '#b42318' : '#0f8b4c';
}

async function restoreSettings() {
  const values = await chrome.storage.sync.get({
    importEndpoint: DEFAULT_IMPORT_ENDPOINT,
    apiToken: ''
  });

  importEndpointNode.value = values.importEndpoint;
  apiTokenNode.value = values.apiToken;
}

async function saveSettings() {
  const importEndpoint = importEndpointNode.value.trim();
  const apiToken = apiTokenNode.value.trim();

  if (!importEndpoint) {
    showStatus('Import endpoint is required.', true);
    return;
  }

  try {
    new URL(importEndpoint);
  } catch {
    showStatus('Import endpoint must be a valid URL.', true);
    return;
  }

  await chrome.storage.sync.set({
    importEndpoint,
    apiToken
  });

  showStatus('Settings saved successfully.');
}

saveButtonNode.addEventListener('click', saveSettings);
restoreSettings().catch((error) => showStatus(error.message, true));
