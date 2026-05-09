# Universal Product Board

Universal Product Board is a Chrome extension that helps you save and organize products from shopping pages into one local browser board.

Version `1.3.0` keeps the extension on a no-build Manifest V3 architecture and prepares it for Chrome Web Store submission with on-demand page access, optional notifications, optional Live Save website access in the side panel, and repository-based release materials.

## Core Product

- Save products from supported `http` and `https` shopping pages
- Review scraped title, price, site, and image before saving
- Save the current product from the popup or from the side panel after enabling Live Save
- Browse saved products in Chrome's side panel with search, sort, and grid/list views
- Update existing saved products by URL instead of creating duplicates
- Copy, open, delete, export, import, and clear saved items
- Keep product data in `chrome.storage.local`

## Privacy Model

- The popup only reads the current page when the user opens the extension and starts a scan
- Live Save is optional and only follows the active shopping tab after the user grants optional website access
- Saved product records stay in local extension storage in this browser
- No analytics, accounts, remote sync, or backend APIs are included
- Product preview images may load directly from merchant or CDN hosts so the extension can show the saved item visually

## Project Structure

```text
universal-product-board/
├── manifest.json
├── shared/
│   ├── constants.js
│   ├── scraper.js
│   └── storage.js
├── background/
│   └── service-worker.js
├── content/
│   └── content-script.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── sidebar/
│   ├── sidebar.html
│   ├── sidebar.css
│   └── sidebar.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
├── assets/
│   ├── icons/
│   └── store/
├── CHROME_WEB_STORE_LISTING.md
├── CHROME_WEB_STORE_SUBMISSION.md
├── PRIVACY_POLICY.md
├── SUPPORT.md
├── RELEASE_CHECKLIST.md
└── TESTING_REPORT.md
```

## Installation

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `universal-product-board` folder

The required PNG icons are already included under `assets/icons/`.

## How To Use

1. Open a supported shopping page
2. Click the extension action
3. Review the scraped preview
4. Save the product
5. Click `View Board` to open the side panel
6. Enable `Live Save` in the side panel only if you want the visible current-page card to follow the active shopping tab while you browse

Use the popup `Settings` link to open the options page for notification preferences, privacy details, and import/export tools.

## Permissions

- `activeTab`: reads the current tab only after the user opens the extension on that tab
- `storage`: saves products and settings locally in the browser
- `scripting`: injects the scraper into the current page on demand
- `sidePanel`: shows the saved product board in Chrome's side panel
- Optional website access on `http` and `https`: lets the side panel Live Save card follow the active shopping tab after the user grants access
- Optional `notifications`: shows save confirmations only if the user enables them in Settings

## Donations

- The popup and sidebar include a visible support link
- An optional weekly donation reminder can appear in those surfaces if enabled
- Donation reminders are local, dismissible for 7 days, and never auto-open the external support page
- Core save and browse functionality does not depend on donations

## Scraping Notes

The shared scraper uses this order:

1. Site-specific selectors for Amazon, Etsy, eBay, and Walmart
2. JSON-LD
3. Microdata
4. Open Graph
5. Generic selectors and page-title/image fallbacks

If only weak data is found, the popup keeps the save action available but labels the result as limited data instead of pretending the page was confidently identified.

## Development

There is no package manager or build step.

Useful validation commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-chrome-webstore-package.ps1
node --check shared/constants.js
node --check shared/storage.js
node --check shared/scraper.js
node --check background/service-worker.js
node --check content/content-script.js
node --check popup/popup.js
node --check sidebar/sidebar.js
node --check options/options.js
powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1
powershell -ExecutionPolicy Bypass -File scripts/package-extension.ps1
```

For the normal Chrome Web Store packaging flow, use the one-command script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-chrome-webstore-package.ps1
```

## Release Materials

- Store listing copy: `CHROME_WEB_STORE_LISTING.md`
- Reviewer notes and permission mapping: `CHROME_WEB_STORE_SUBMISSION.md`
- Privacy policy source: `PRIVACY_POLICY.md`
- Support artifact: `SUPPORT.md`
- Release checklist: `RELEASE_CHECKLIST.md`
- Static validation record: `TESTING_REPORT.md`
- Chrome Web Store image assets: `assets/store/`

## Known Limitations

- Affiliate link conversion is intentionally disabled until real retailer IDs are configured
- There is still only one board; multi-board behavior is not implemented
- No automated test suite is included yet
- A public HTTPS privacy policy URL still needs to be hosted before Chrome Web Store submission
- Manual interactive Chrome QA still needs to be completed outside this workspace
