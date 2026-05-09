# Codebase Audit

## Overview

This audit captures the state of the extension before the v1.1 cleanup and what the implementation addressed.

## Architecture

- The original repo split core runtime logic across `background/*`, `utils/*`, and an inline scraper inside `content/content-script.js`.
- `background/constants.js` and `utils/constants.js` duplicated the same constants with different loading strategies.
- `background/storage.js` and `utils/storage.js` duplicated the same storage wrapper.
- `utils/scraper.js` had better scraping logic than the live content script, but it was not wired into runtime execution.
- Result: maintenance drift and a high chance of fixing one runtime path while leaving another stale.

## Runtime Flow

- Popup requested scraping through the background worker.
- Background queried the active tab and messaged the content script.
- Content script returned a scrape result.
- Background normalized and saved products in `chrome.storage.local`.
- Sidebar fetched products through background messaging instead of reading storage directly.

Issues found:

- Sidebar expected a `PRODUCTS_UPDATED` runtime message that was never sent.
- Popup blocked saving based on a heuristic product-page check before attempting an actual scrape.
- Popup closed itself shortly after saving, which hid update-vs-create behavior.

## Manifest Correctness

What was already correct:

- Valid MV3 manifest
- Background service worker registered
- Side panel configured
- Popup configured
- Required icon paths pointed to real files under `assets/icons/`

Problems found:

- `options_ui` was missing even though the popup exposed a Settings link
- `windows` permission was not required by the implemented behavior
- Content scripts loaded only the weak inline scraper path

## Message Passing

Problems found:

- Background and content scripts used a `sendResponse.sent` mutation pattern to avoid double responses
- Debug-only message types (`TEST`, `TEST_CONTENT`) and dead constants lived in the shipped runtime
- Sidebar used background messaging for read-only product access that could be handled directly from storage

## Storage

What was good:

- Products were already stored locally
- Save behavior already used URL-based upsert semantics
- Export/import methods already existed

Problems found:

- Export/import had no UI
- Settings included unsupported fields (`autoSave`, `defaultBoard`)
- Sidebar did not listen to storage changes

## Scraper Quality

Original runtime scraper issues:

- Live content script only used Open Graph and generic selectors
- No JSON-LD or microdata extraction in the runtime path
- No site-specific scrapers in the runtime path
- SPA navigation recreated handlers and listeners instead of refreshing scraper state

## Popup UX

Problems found:

- Heuristic product-page gating caused false negatives
- Save state messaging did not distinguish create vs update
- Settings entry was misleading
- Errors were generic and often collapsed different failure modes into one message

## Sidebar UX

Problems found:

- No live refresh after saves/imports/deletes elsewhere
- Product cards were built with `innerHTML` and interpolated scraped values
- Copy-link feedback only logged to console
- Sort menu UI was generated with inline styles in JS instead of maintained in HTML/CSS

## Icons And Assets

- Manifest icon paths were valid
- Actual PNG icons existed in `assets/icons/`
- Extra root-level PNG duplicates existed and created confusion
- One-off icon generation scripts were present but not needed for runtime

## Security And Privacy

Positive findings:

- Data stayed local in `chrome.storage.local`
- No backend or analytics integration

Risks found:

- Sidebar HTML interpolation with scraped values increased XSS exposure
- Placeholder affiliate rewriting changed user URLs without real affiliate configuration

## MV3 / Chrome Web Store Readiness

Pre-v1.1 concerns:

- Manual keep-alive loop in the service worker was not appropriate for a production MV3 worker
- Placeholder affiliate IDs were not release-safe
- Broken Settings flow was user-visible
- Repo structure implied unsupported features

## Fix Now Vs Later

Fixed in v1.1:

- Shared runtime consolidation
- Shared scraper integration
- Working options page
- Sidebar live storage sync
- Safer sidebar DOM rendering
- Background messaging cleanup
- Permission cleanup
- Disabled placeholder affiliate rewriting

Deferred:

- Multi-board support
- Auto-save
- Affiliate ID configuration UI
- Price tracking
- Automated tests
