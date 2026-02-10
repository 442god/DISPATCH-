const BUTTON_LABEL = 'Import to Super Dispatch';
const PROCESSED_ATTR = 'data-sd-import-bound';

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function parseRoute(text) {
  const clean = cleanText(text);
  const parts = clean.split(':');
  if (parts.length < 2) {
    return { location: clean, state: '', zip: '' };
  }

  const locationPart = parts.slice(1).join(':').trim();
  const [stateRaw = '', zipRaw = ''] = locationPart.split(',').map((x) => x.trim());
  return {
    location: clean,
    state: stateRaw,
    zip: zipRaw
  };
}

function parsePrice(loadInfoText) {
  const match = cleanText(loadInfoText).match(/\$\s?([\d,.]+)/);
  return match ? match[1].replace(/,/g, '') : '';
}

function parseVehicle(vehicleLine) {
  const clean = cleanText(vehicleLine);
  const match = clean.match(/^(\d{4})\s+([^|]+?)(?:\s*\|\s*(.*))?$/);
  if (!match) {
    return {
      raw: clean,
      year: '',
      makeModel: clean,
      lotOrVin: ''
    };
  }

  return {
    raw: clean,
    year: match[1],
    makeModel: cleanText(match[2]),
    lotOrVin: cleanText(match[3])
  };
}

function extractLoadData(card) {
  const dispatchId = cleanText(card.querySelector('a[href*="dispatch"], a')?.textContent || '');
  const shipperName = cleanText(card.querySelector('[class*="shipper"] a, [class*="shipper"]')?.textContent || '');
  const originText = cleanText(card.querySelector('[class*="origin"]')?.textContent || '');
  const destinationText = cleanText(card.querySelector('[class*="destination"]')?.textContent || '');

  const loadInfoBlock = card.querySelector('[class*="load"]');
  const loadInfoText = cleanText(loadInfoBlock?.textContent || '');

  const vehicleLine = Array.from(card.querySelectorAll('div, span, p'))
    .map((el) => cleanText(el.textContent))
    .find((line) => /^\d{4}\s+.+/.test(line)) || '';

  return {
    source: 'central_dispatch',
    sourceUrl: window.location.href,
    dispatchId,
    shipperName,
    priceUsd: parsePrice(loadInfoText),
    vehicle: parseVehicle(vehicleLine),
    origin: parseRoute(originText),
    destination: parseRoute(destinationText),
    importedAt: new Date().toISOString()
  };
}

function extractDispatchId(card) {
  const anchors = Array.from(card.querySelectorAll('a'));
  const callLink = anchors.find((a) => /^Call\w+/i.test(cleanText(a.textContent)));
  if (callLink) {
    return cleanText(callLink.textContent);
  }

  return cleanText(card.querySelector('a[href*="dispatch"], a')?.textContent || '');
}

async function importLoad(card, button) {
  button.disabled = true;
  button.textContent = 'Importing…';

  const payload = extractLoadData(card);

  const response = await chrome.runtime.sendMessage({
    type: 'IMPORT_LOAD',
    payload
  });

  if (!response?.ok) {
    throw new Error(response?.error || 'Unknown import error.');
  }

  button.dataset.status = 'done';
  button.textContent = 'Imported ✓';
}

function findInsertionNode(card) {
  return card.querySelector('[class*="load"]') || card;
}

function createImportButton(card) {
  if (card.hasAttribute(PROCESSED_ATTR) || card.querySelector('.sd-import-btn')) {
    return;
  }

  const loadInfoNode = findInsertionNode(card);
  const button = document.createElement('button');
  button.className = 'sd-import-btn';
  button.type = 'button';
  button.textContent = BUTTON_LABEL;

  button.addEventListener('click', async () => {
    try {
      await importLoad(card, button);
    } catch (error) {
      button.dataset.status = 'error';
      button.disabled = false;
      button.textContent = 'Retry import';
      // eslint-disable-next-line no-alert
      alert(`Super Dispatch import failed: ${error.message}`);
    }
  });

  loadInfoNode.appendChild(button);
  card.setAttribute(PROCESSED_ATTR, 'true');
}

function hasLoadMarkers(node) {
  const text = cleanText(node.textContent);
  return /Dispatch Info/i.test(text) && /Load Info/i.test(text);
}

function countCallLinks(node) {
  return Array.from(node.querySelectorAll('a')).filter((a) => /^Call\w+/i.test(cleanText(a.textContent))).length;
}

function findCardFromCallLink(callLink) {
  let candidate = callLink.closest('article, section, li, div');
  if (!candidate) {
    return null;
  }

  while (candidate.parentElement) {
    const parent = candidate.parentElement.closest('article, section, li, div');
    if (!parent || !hasLoadMarkers(parent)) {
      break;
    }

    if (countCallLinks(parent) > 1) {
      break;
    }

    candidate = parent;
  }

  return hasLoadMarkers(candidate) ? candidate : null;
}

function getCandidateCards() {
  const callLinks = Array.from(document.querySelectorAll('a')).filter((a) => /^Call\w+/i.test(cleanText(a.textContent)));
  const cardsByDispatch = new Map();

  callLinks.forEach((callLink) => {
    const card = findCardFromCallLink(callLink);
    if (!card) {
      return;
    }

    const dispatchId = extractDispatchId(card);
    const key = dispatchId || `card-${cardsByDispatch.size + 1}`;

    if (!cardsByDispatch.has(key)) {
      cardsByDispatch.set(key, card);
    }
  });

  return Array.from(cardsByDispatch.values());
}

function bindButtons() {
  const cards = getCandidateCards();
  cards.forEach((card) => createImportButton(card));
}

const observer = new MutationObserver(() => bindButtons());
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindButtons, { once: true });
} else {
  bindButtons();
}
