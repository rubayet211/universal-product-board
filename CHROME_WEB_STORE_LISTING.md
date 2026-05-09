# Chrome Web Store Listing Copy

## Name
Universal Product Board

## Category
Shopping

## Short Description
Save and organize products from shopping pages into one local browser board.

## Detailed Description
Universal Product Board helps you save product details from shopping pages into one browser-side board.

Open the extension on a product page, review the extracted title, price, image, and site, then save the item to your board. Open the side panel to browse everything you have saved, search and sort your collection, and reopen or copy product links when you need them again.

If you want a side-panel card that follows the active shopping tab, you can optionally enable Live Save and approve website access. Save notifications are also optional and stay off unless you turn them on in Settings.

### Key Features
- Save products from supported shopping pages on demand
- Review product details before saving
- Keep a local board in Chrome's side panel
- Search, sort, and browse saved products in grid or list view
- Update saved items by URL instead of creating duplicates
- Export and import local board data
- Keep notifications and Live Save permissions optional

## Permission Justifications

- `activeTab`: Reads the current page only after you open the extension on that tab.
- `scripting`: Injects the scraper into the active page only when needed.
- `storage`: Saves your products and settings locally in the browser.
- `sidePanel`: Shows the saved-product board in Chrome's side panel.
- Optional website access on `http` and `https`: Lets the side panel Live Save card follow the active shopping tab after you approve access.
- Optional `notifications`: Shows save confirmations only if you enable them in Settings.

## Privacy Disclosure Summary

- Saved products stay in `chrome.storage.local` in your browser.
- No analytics, accounts, remote sync, or product API backend are included.
- The popup only reads a page when you ask it to.
- Live Save only follows the active shopping tab after you grant optional website access.
- Product preview images may load directly from merchant or CDN hosts so the extension can display the product visually.

## Reviewer Notes Summary

- The extension's single purpose is saving and organizing products from shopping pages.
- Core functionality works without optional permissions.
- Donation links are optional support actions only and do not change feature access.

## Suggested First Release Notes

Version 1.3.0

- Initial public release of Universal Product Board
- Save and organize products from supported shopping pages
- Browse saved items in a Chrome side panel board
- Optional Live Save current-page card
- Optional save notifications
- Export and import local board data
