# Central Dispatch → Super Dispatch Chrome Extension

This extension injects an **Import to Super Dispatch** button into Central Dispatch load cards and sends parsed load data to a configurable HTTP endpoint.

## Features

- Adds an import button on Central Dispatch pages.
- Parses basic load information from the visible card:
  - dispatch ID
  - shipper name
  - route (origin/destination)
  - first detected vehicle line
  - extracted price
- Sends data as JSON to an endpoint you configure.
- Supports optional Bearer token authentication (recommended only for your own backend endpoint).

## Install (developer mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

## Configure

1. Open extension details.
2. Click **Extension options**.
3. Set your import endpoint URL.
4. (Optional) add API token.

## Payload format

```json
{
  "source": "central_dispatch",
  "sourceUrl": "https://...",
  "dispatchId": "Call123",
  "shipperName": "AutomaX Chicago Inc.",
  "priceUsd": "150",
  "vehicle": {
    "raw": "2017 Lexus NX | H2055933",
    "year": "2017",
    "makeModel": "Lexus NX",
    "lotOrVin": "H2055933"
  },
  "origin": {
    "location": "WI: Franklin, 53132",
    "state": "Franklin",
    "zip": "53132"
  },
  "destination": {
    "location": "IL: Des Plaines, 60016",
    "state": "Des Plaines",
    "zip": "60016"
  },
  "importedAt": "2026-02-10T12:00:00.000Z"
}
```

## Notes

- Selectors in Central Dispatch can change; adjust parsing logic in `content.js` if needed.
- The default endpoint in code is a placeholder and should be replaced with your actual backend endpoint.

- If your endpoint is on `superdispatch.com`, do **not** paste a browser cookie/session token in extension settings. Use an integration/backend token from your API service.
