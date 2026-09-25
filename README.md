# Freelancermap Auto Checkboxes

Chrome extension for automatically selecting matching checkboxes in project modals on `freelancermap.de` and `freelancermap.ch`. It can also keep read project status in sync across multiple Freelancermap accounts.

## What It Does

The extension watches Freelancermap pages for newly opened project modals and checks matching checkboxes automatically. By default, it selects checkboxes whose label contains one of these terms:

- `AGB`
- `allgemeine Geschaeftsbedingungen`
- `allgemeine Geschäftsbedingungen`
- `Datenschutz`
- `Referenz`
- `CV-en`
- `CV-de`

The matching is case-insensitive and tolerant of German umlauts, so `Geschäftsbedingungen` and `Geschaeftsbedingungen` can both be configured.

The extension can also track read projects locally. When a project is opened or already marked as read by Freelancermap, its project URL is stored. On later page loads, matching unread project cards are opened and closed automatically so Freelancermap marks them as read for the current account as well. Stored read-project entries older than 90 days are removed automatically.

## Configuration

Click the extension icon in Chrome to open the popup. From there you can:

- Add more search terms
- Edit existing search terms
- Remove search terms
- Restore the default terms
- Enable or disable cross-account read project tracking

Search-term configuration is stored with `chrome.storage.sync`, so Chrome can sync it across browsers when sync is enabled. Read-project tracking data is stored with `chrome.storage.local` and stays on the current browser profile.

## Installation For Development

1. Open `chrome://extensions` in Chrome.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.
5. Open `https://www.freelancermap.de` or `https://www.freelancermap.ch` and open a project modal.

## Files

- `manifest.json`: Chrome Manifest V3 configuration
- `src/content.js`: DOM observer, checkbox matching logic, and read-project tracking
- `src/popup.html`: Extension popup UI
- `src/popup.css`: Popup styles
- `src/popup.js`: Popup configuration logic
- `icons/*.svg`: Extension icons

## Permissions

The extension requests only:

- `storage`: saves configured search terms, the read-project tracking toggle, and locally tracked read projects
- Host access for `https://www.freelancermap.de/*` and `https://www.freelancermap.ch/*`: runs the checkbox automation only on these pages

## Privacy

The extension does not collect, transmit, or sell data. It only reads checkbox labels and project-card links on supported Freelancermap pages. Search terms are stored in Chrome sync storage, while read-project status is stored locally in Chrome storage and cleaned up after 90 days.
