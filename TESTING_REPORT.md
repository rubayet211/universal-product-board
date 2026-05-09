# Testing Report

## Validation Summary

This workspace allowed strong static validation and repository-level verification. A full interactive Chrome session was not executed from this environment, so runtime checks that require loading the unpacked extension in Chrome remain listed as manual QA items.

This report now reflects the `1.3.0` Chrome Web Store readiness pass.

## Static Validation Performed

### JavaScript Syntax

Ran `node --check` successfully on:

- `shared/constants.js`
- `shared/storage.js`
- `shared/scraper.js`
- `background/service-worker.js`
- `content/content-script.js`
- `popup/popup.js`
- `sidebar/sidebar.js`
- `options/options.js`

### Manifest And Asset Checks

- Confirmed `manifest.json` is valid JSON
- Confirmed `manifest.json` icon paths point to existing files under `assets/icons/`
- Confirmed required permissions are limited to `activeTab`, `storage`, `scripting`, and `sidePanel`
- Confirmed `notifications` moved to `optional_permissions`
- Confirmed optional website access for Live Save is declared in `optional_host_permissions`
- Confirmed static `content_scripts` and `host_permissions` are absent
- Confirmed `minimum_chrome_version` is set to `116`
- Confirmed `assets/icons/icon16.png` is `16x16`
- Confirmed `assets/icons/icon48.png` is `48x48`
- Confirmed `assets/icons/icon128.png` is `128x128`

### Code-Level Validation

- Verified popup uses direct storage reads for product counts and a real options-page link
- Verified the background injects the scraper on demand instead of relying on always-on content scripts
- Verified the background supports both active-tab scraping and side-panel tab-targeted scraping
- Verified side panel listens to `chrome.storage.onChanged` for live product updates
- Verified the side panel can gate Live Save behind optional host access and refresh the current-page preview as tabs change
- Verified the content script now uses a singleton controller and shared scraper
- Verified background message handling is limited to scrape/save orchestration
- Verified notifications require optional permission approval before use
- Verified donation reminders stay local, dismissible, and separate from Chrome notifications
- Verified placeholder affiliate IDs no longer rewrite URLs by default
- Verified unsupported settings (`autoSave`, `defaultBoard`) are no longer part of the active settings schema
- Verified imported board data now keeps only valid `http` or `https` product URLs
- Verified saved/opened product links are normalized through the shared storage layer
- Verified privacy copy now discloses remote merchant/CDN image loads for product previews

## Manual QA Checklist

Run these checks after loading the extension unpacked in Chrome:

1. Load the extension from `chrome://extensions`
2. Confirm install does not show an all-sites host permission warning
3. Confirm there are no missing icon errors
4. Open the popup on a supported product page
5. Confirm the popup privacy disclosure is visible
6. Confirm the popup shows one of:
   - strong product preview
   - limited-data preview
   - unsupported page message
7. Save a new product and confirm:
   - success feedback appears
   - the popup stays open
   - the product count increases
8. Save the same URL again and confirm it updates instead of duplicating
9. Open the side panel and verify:
   - products render
   - grid/list toggle works
   - sorting works
   - search works
10. With the side panel open, save or delete a product elsewhere and confirm the panel refreshes automatically
11. Copy a product link and confirm a visible toast appears
12. Delete a product and confirm the board updates immediately
13. Open Settings and verify:
    - privacy policy link opens
    - notification toggle prompts for optional permission when enabled
    - donation reminder toggle enables and disables weekly donation banners
    - save notifications appear only after permission is granted
    - export downloads JSON
    - import restores products/settings from JSON
    - clear products removes saved items
14. Open the popup and sidebar and verify:
    - a visible donate link is present in both places
    - the weekly donation reminder appears only when due
    - clicking `Not now` hides the reminder for 7 days
    - clicking `Donate` opens the donation page only after the explicit click
15. Open the side panel and verify:
    - the Current Page card asks to enable Live Save before optional host access is granted
    - enabling Live Save triggers the optional site-access prompt
    - switching active product tabs updates the Current Page preview
    - navigating the active tab updates the Current Page preview after the page loads
    - denied or removed site access returns the Current Page card to the gated state
16. Open a restricted page such as `chrome://extensions` and confirm the popup or side panel shows the restricted-page message
17. Inspect popup, background, content, sidebar, and options DevTools consoles for runtime errors

## Known Remaining Gaps

- No automated test suite exists yet
- Runtime validation in actual Chrome still needs to be completed manually
- Affiliate configuration is intentionally not exposed in UI and remains disabled until real IDs exist
- A public HTTPS privacy policy URL must still be published before store submission
- A real support email or support URL still needs to be supplied in the final store dashboard
