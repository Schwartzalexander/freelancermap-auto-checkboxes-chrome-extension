# Freelancermap Auto Checkboxes

Chrome extension for automatically selecting matching checkboxes in project modals on `freelancermap.de` and `freelancermap.ch`.

## What It Does

The extension watches Freelancermap pages for newly opened project modals and checks matching checkboxes automatically. By default, it selects checkboxes whose label contains one of these terms:

- `AGB`
- `allgemeine Geschaeftsbedingungen`
- `allgemeine Geschäftsbedingungen`
- `Referenz`
- `CV-en`
- `CV-de`

The matching is case-insensitive and tolerant of German umlauts, so `Geschäftsbedingungen` and `Geschaeftsbedingungen` can both be configured.

## Configuration

Click the extension icon in Chrome to open the popup. From there you can:

- Add more search terms
- Edit existing search terms
- Remove search terms
- Restore the default terms

Configuration is stored with `chrome.storage.sync`, so Chrome can sync it across browsers when sync is enabled.

## Installation For Development

1. Open `chrome://extensions` in Chrome.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.
5. Open `https://www.freelancermap.de` or `https://www.freelancermap.ch` and open a project modal.

## Files

- `manifest.json`: Chrome Manifest V3 configuration
- `src/content.js`: DOM observer and checkbox matching logic
- `src/popup.html`: Extension popup UI
- `src/popup.css`: Popup styles
- `src/popup.js`: Popup configuration logic
- `icons/*.svg`: Extension icons

## Permissions

The extension requests only:

- `storage`: saves the configured search terms
- Host access for `https://www.freelancermap.de/*` and `https://www.freelancermap.ch/*`: runs the checkbox automation only on these pages

## Privacy

The extension does not collect, transmit, or sell data. It only reads checkbox labels on supported Freelancermap pages and stores your local search-term configuration in Chrome storage.
