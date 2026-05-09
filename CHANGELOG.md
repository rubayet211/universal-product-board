# Changelog

## 1.3.0

### Publishing Release

- Bumped the package to `1.3.0` for Chrome Web Store submission
- Added visible donate links in the popup and sidebar
- Added a local, dismissible weekly donation reminder with a Settings toggle
- Kept donation prompts fully in-product with no notification usage or automatic external navigation
- Updated privacy, reviewer, testing, and release-checklist documents to match the latest runtime behavior

## 1.2.0

### Chrome Web Store Readiness

- Reduced required install-time permissions to `activeTab`, `storage`, `scripting`, and `sidePanel`
- Removed static `content_scripts` and all-sites `host_permissions`
- Added `minimum_chrome_version: 116`
- Moved `notifications` to `optional_permissions`
- Added optional `http` and `https` host access for side-panel Live Save

### Runtime And Settings

- Switched scraping to fully on-demand script injection from the popup flow
- Added a tab-targeted scrape path for the side panel
- Removed the install-time welcome notification
- Defaulted `showNotifications` to `false`
- Added a `showDonationReminders` setting with local weekly reminder tracking
- Added runtime permission checks before showing save notifications
- Updated export metadata to version `1.2.0`

### UI And Submission Materials

- Added a Current Page Live Save card to the side panel that can follow active tab changes
- Added visible donate links in the popup and sidebar plus a dismissible once-a-week donation reminder
- Added privacy disclosures to the popup and options page
- Added a packaged `privacy-policy.html` page and repository `PRIVACY_POLICY.md`
- Added `CHROME_WEB_STORE_SUBMISSION.md` and `RELEASE_CHECKLIST.md`
- Added release validation and deterministic packaging scripts under `scripts/`

## 1.1.0

### Shared Runtime

- Added `shared/constants.js` as the single constants source of truth
- Added `shared/storage.js` for settings and product persistence across popup, sidebar, background, and options
- Added `shared/scraper.js` and moved stronger scraper logic into the live runtime path
- Removed duplicated runtime files from `background/*` and `utils/*`

### Background And Content Scripts

- Rebuilt the service worker around a smaller message router for scrape and save operations
- Removed keep-alive logic and debug-only message handling
- Added content-script reinjection with shared runtime dependencies
- Replaced SPA reinitialization with a singleton content controller that refreshes scraper state safely

### Popup

- Removed heuristic page gating before scraping
- Added scrape-confidence messaging to the preview
- Added explicit create-vs-update save feedback
- Kept the popup open after save instead of auto-closing
- Switched the Settings footer link to a real options page
- Read saved product counts directly from shared storage

### Sidebar

- Switched product reads to shared storage
- Added live refresh via `chrome.storage.onChanged`
- Rebuilt product cards with safe DOM APIs instead of `innerHTML`
- Added maintained sort menu markup and toast feedback
- Preserved search, sort, and view state during live product updates

### Options

- Added a real options page
- Added notification preference management
- Added export/import tools
- Added a clear-products action

### Release Cleanup

- Disabled placeholder affiliate rewriting by default
- Removed the unnecessary `windows` permission
- Removed redundant top-level icon copies
- Removed one-off icon generation scripts
- Updated manifest version to `1.1.0`

### Documentation

- Rewrote `README.md`
- Added `CODEBASE_AUDIT.md`
- Added `IMPLEMENTATION_PLAN.md`
- Added `TESTING_REPORT.md`
