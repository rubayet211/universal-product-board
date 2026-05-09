# Chrome Web Store Submission Notes

This file is intended for Chrome Web Store reviewers and for the final submission pass.

## Product Summary

Universal Product Board is a local-first Chrome extension that lets users save and organize products from shopping pages into one browser-side board. The popup reads the current page only when the user opens the extension and starts a scan. The side panel shows saved items and can optionally follow the active shopping tab through the Live Save card after the user grants website access.

## Required Permissions

- `activeTab`
  - Used to read the current page only after the user opens the extension on that tab.
- `scripting`
  - Used to inject the scraper into the active tab on demand.
- `storage`
  - Used to store saved products, settings, and local donation reminder timestamps in `chrome.storage.local`.
- `sidePanel`
  - Used to open and display the saved product board in Chrome's side panel.

## Optional Permissions

- Optional `http://*/*` and `https://*/*` website access
  - Used only if the user enables Live Save in the side panel.
  - Lets the visible current-page card follow the active shopping tab and page while the side panel is open.
- Optional `notifications`
  - Used only if the user enables save confirmations in Settings.

## Data Handling

- Saved product data stays in local extension storage in the current browser profile.
- No analytics, remote sync, account system, or external product API calls are included.
- The extension does not transmit saved product records to a remote server.
- Product preview images may load directly from merchant or CDN hosts so the extension can display the visual product preview.

## Main User Flows

### Popup Flow
1. Open a supported shopping page.
2. Click the extension action.
3. The popup requests an on-demand scrape of the current page.
4. Review the extracted title, price, image, and site.
5. Save or update the product in the local board.

### Side Panel Flow
1. Open the side panel from the popup.
2. Browse saved products with search, sort, and grid/list views.
3. Optionally click `Enable Live Save`.
4. Approve website access if prompted.
5. Save the current product from the visible Live Save card.

### Settings Flow
1. Open `Settings` from the popup.
2. Enable or disable save notifications.
3. Enable or disable weekly donation reminders.
4. Export, import, or clear local board data.
5. Open the packaged privacy policy page.

## Restricted And Unsupported Pages

- `chrome://` pages, the Chrome Web Store, and other protected pages cannot be scanned by design because Chrome blocks extension scripting there.
- If Live Save access is not granted, the side panel shows a permission explanation instead of scanning pages.
- Only valid `http` and `https` product URLs are kept when importing saved data.

## Donation And Support Surface

- The popup and sidebar include a visible support link.
- An optional inline weekly donation reminder can appear at most once every 7 days if enabled.
- The donation page opens only after an explicit user click.
- Donation prompts do not unlock, block, or interrupt core functionality.

## Submission Reminders

- Host the contents of `PRIVACY_POLICY.md` at a public HTTPS URL before submission.
- Upload the assets under `assets/store/` as Chrome Web Store listing images.
- Use `CHROME_WEB_STORE_LISTING.md` for final listing copy.
