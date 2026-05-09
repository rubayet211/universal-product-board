# Implementation Plan

## Critical

### Shared Runtime Consolidation

- Problem: duplicated constants, storage, and scraper logic drifted out of sync
- Root cause: background used classic scripts while `utils/*` used ES modules and the content script copied an older scraper
- Fix: added `shared/constants.js`, `shared/storage.js`, and `shared/scraper.js`; rewired runtime entry points to those files; removed duplicate runtime files
- Files: `manifest.json`, `shared/*`, `background/service-worker.js`, `content/content-script.js`, `popup/popup.html`, `sidebar/sidebar.html`, `options/options.html`
- Risk: Medium
- Impact: single runtime source of truth

### Shared Scraper In Runtime

- Problem: the stronger scraper existed but was unused
- Root cause: content script embedded a limited scraper
- Fix: moved the stronger logic into `shared/scraper.js` and used it from the content script
- Files: `shared/scraper.js`, `content/content-script.js`, `background/service-worker.js`
- Risk: Medium
- Impact: stronger product extraction and clearer scrape confidence

### Minimal Working Settings

- Problem: Settings link existed without an options page
- Root cause: `chrome.runtime.openOptionsPage()` had no manifest target
- Fix: added `options_ui` and shipped a working options page for notifications, export, import, and clearing products
- Files: `manifest.json`, `options/*`, `popup/popup.js`
- Risk: Low
- Impact: no more dead Settings UX

### Sidebar Live Refresh

- Problem: side panel stayed stale after changes made elsewhere
- Root cause: it waited for a runtime message that was never sent
- Fix: moved sidebar product reads to shared storage and subscribed to `chrome.storage.onChanged`
- Files: `sidebar/sidebar.js`
- Risk: Low
- Impact: board stays current without manual refresh

## High

### Content Script Stability

- Problem: SPA tabs could accumulate duplicate message listeners
- Root cause: the content script re-instantiated handlers on URL changes
- Fix: replaced that pattern with a singleton controller that refreshes scraper state on URL changes
- Files: `content/content-script.js`
- Risk: Low
- Impact: fewer long-session scrape bugs

### Background Reliability Cleanup

- Problem: the service worker carried keep-alive logic, dead debug handlers, and brittle response handling
- Root cause: prototype-era defensive code
- Fix: rebuilt the worker around a small message router and promise-based tab messaging
- Files: `background/service-worker.js`
- Risk: Medium
- Impact: simpler MV3 lifecycle and easier maintenance

### Affiliate Safety

- Problem: placeholder affiliate IDs rewrote supported retailer URLs
- Root cause: mappings were always active
- Fix: kept retailer mappings but defaulted every mapping to disabled by setting `affiliateId: null`
- Files: `shared/constants.js`, `background/service-worker.js`
- Risk: Low
- Impact: safer release behavior

### Popup Flow Cleanup

- Problem: popup used a heuristic gate, generic failures, and auto-closed after save
- Root cause: save flow was optimized around a prototype path
- Fix: always attempt a scrape on supported URLs, surface scrape confidence in the preview, and keep the popup open with create/update feedback
- Files: `popup/popup.js`, `popup/popup.html`, `popup/popup.css`
- Risk: Medium
- Impact: clearer save workflow

### Sidebar Safe Rendering

- Problem: sidebar interpolated scraped content into `innerHTML`
- Root cause: cards were built as HTML strings
- Fix: rebuilt cards with DOM node creation and safe property assignment
- Files: `sidebar/sidebar.js`
- Risk: Low
- Impact: lower XSS exposure and cleaner UI code

## Medium

### Manifest And Asset Cleanup

- Problem: permissions and top-level assets were slightly messy
- Root cause: leftover prototype scaffolding
- Fix: removed the `windows` permission, added `options_ui`, and deleted redundant root-level icon copies and generator scripts
- Files: `manifest.json`, deleted root assets/scripts
- Risk: Low
- Impact: cleaner package for release

### Settings Schema Cleanup

- Problem: unsupported settings remained in defaults
- Root cause: unfinished feature ideas leaked into persistent config
- Fix: trimmed supported settings down to `showNotifications` and normalized imported settings
- Files: `shared/constants.js`, `shared/storage.js`, `options/options.js`
- Risk: Low
- Impact: less misleading storage schema

### Sidebar UX Polish

- Problem: feedback and sorting UI were rough
- Root cause: prototype-level interaction details
- Fix: added a maintained sort menu in HTML/CSS and visible toast feedback for copy/delete failures and success
- Files: `sidebar/sidebar.html`, `sidebar/sidebar.css`, `sidebar/sidebar.js`
- Risk: Low
- Impact: more polished side panel

## Low

### Documentation Refresh

- Problem: repo documentation described stale architecture and setup
- Root cause: the README predated the cleanup work
- Fix: rewrote `README.md` and added the required handoff docs
- Files: `README.md`, `CODEBASE_AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `CHANGELOG.md`, `TESTING_REPORT.md`
- Risk: Low
- Impact: accurate handoff for future work
