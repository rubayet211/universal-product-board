# Universal Product Board Privacy Policy

Effective date: March 25, 2026

Universal Product Board is a Chrome extension that lets users save product details from shopping pages into a local board stored in the browser.

## What the extension accesses

The extension reads the current page only when the user opens the extension on that page and starts a scan. It does not run automatically across all sites in the published configuration.

If the user enables Live Save in the side panel, the extension also reads active `http` and `https` pages so the visible current-page save card can stay updated while the user switches tabs and pages.

When product previews are shown in the popup or side panel, image URLs from merchant or CDN hosts may load directly in the extension UI so the user can see the product image that was found on the page.

## What data is stored

When a user saves a product, the extension stores these fields in `chrome.storage.local` on the user's device:

- Product title
- Price
- Currency
- Image URL
- Source URL
- Site name
- Save and update timestamps

If donation reminders are enabled, the extension also stores local reminder timestamps used to decide when to show the next weekly donation prompt.

## What data is not collected

- No account or sign-in is required.
- No analytics or tracking services are included.
- No product data is transmitted to a remote server by this extension.
- No browsing history is collected outside the current page the user chooses to scan or the active page the user has allowed for Live Save in the side panel.

## Notifications

Notifications are optional. The extension requests notification access only if the user enables save notifications in Settings. If granted, notifications are used only to confirm that a product was saved.

## Import and export

Export creates a local JSON file in the user's browser. Import reads a user-selected local JSON file and replaces the saved products and supported settings stored by the extension. Invalid entries without usable `http` or `https` product URLs are ignored.

## Data control

Users can delete individual products, clear all saved products, disable notifications, or uninstall the extension at any time.

Users can also disable weekly donation reminders in Settings. The donation link remains visible, but the once-a-week reminder will stop appearing.

## Chrome Web Store publishing note

Before submission, publish this policy at a public HTTPS URL and use that URL in the Chrome Web Store privacy section.
