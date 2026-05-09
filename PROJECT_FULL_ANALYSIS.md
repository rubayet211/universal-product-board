# Universal Product Board — Full Codebase Analysis

**Document purpose:** Definitive handoff for humans and LLMs. Grounded in repository files as of analysis date.  
**Repository path:** `h:\Extension\universal-product-board`  
**Version in manifest:** `1.1.0`  
**Git:** Not a git repository (per workspace metadata).

---

## 1. Project Overview

| Attribute | Value |
|-----------|--------|
| **Product type** | Browser extension (Chrome Manifest V3) |
| **Name** | Universal Product Board (`manifest.json` → `name`) |
| **One-line description** | Save, organize, and track products from e-commerce sites in a unified local “board” (`manifest.json` → `description`) |
| **Primary surfaces** | Toolbar popup (`popup/`), Chrome Side Panel (`sidebar/`), full-tab options page (`options/`), invisible content script on web pages (`content/`), background service worker (`background/`) |
| **Data residency** | 100% local: `chrome.storage.local` (no remote API or database in this codebase) |
| **Build system** | None — plain HTML/CSS/JS loaded unpacked |

---

## 2. Executive Summary

Universal Product Board is a **no-build, Manifest V3 Chrome extension** that scrapes product-like metadata from the active browser tab, lets the user preview and save/update items keyed by URL, and browse them in a **side panel** with search, sort, and grid/list views. Shared logic lives under `shared/` (`constants.js`, `storage.js`, `scraper.js`). The **background service worker** (`background/service-worker.js`) orchestrates scrape requests (messaging the content script, with optional `chrome.scripting.executeScript` reinjection) and save operations (persisting via `UniversalProductBoard.storageManager`, optional notifications). There is **no traditional backend**, **no package.json**, **no ORM**, and **no user accounts** — only Chrome extension APIs and local storage.

Version 1.1.0 (documented in `README.md`, `CHANGELOG.md`, `CODEBASE_AUDIT.md`) consolidated duplicated runtime code, integrated a richer scraper, added a working options page, improved sidebar live updates and safer DOM rendering, and disabled placeholder affiliate URL rewriting (`AFFILIATE_MAPPINGS` entries use `affiliateId: null` in `shared/constants.js`).

---

## 3. Tech Stack Summary

| Layer | Technology | Evidence |
|-------|------------|----------|
| Extension platform | Chrome Extension Manifest V3 | `manifest.json` (`manifest_version`: 3, `background.service_worker`) |
| Languages | JavaScript (classic scripts, IIFE + `importScripts` + ES classes) | All `*.js` under `shared/`, `background/`, `content/`, `popup/`, `sidebar/`, `options/` |
| Markup | HTML5 | `popup/popup.html`, `sidebar/sidebar.html`, `options/options.html` |
| Styling | Plain CSS (custom properties, media queries, `prefers-color-scheme`) | `popup/popup.css`, `sidebar/sidebar.css`, `options/options.css` |
| Storage | `chrome.storage.local` | `shared/storage.js` → `StorageManager` |
| Messaging | `chrome.runtime.sendMessage` / `onMessage`, `chrome.tabs.sendMessage` | `background/service-worker.js`, `content/content-script.js`, `popup/popup.js` |
| Script injection | `chrome.scripting.executeScript` | `background/service-worker.js` → `scrapeActiveTab` |
| Side panel | `chrome.sidePanel` | `manifest.json` → `side_panel`; `popup/popup.js` → `handleSidebarToggle` |
| Notifications | `chrome.notifications` | `background/service-worker.js` → `showSaveNotification`, `handleInstallation` |
| Package manager | **None** | No `package.json` in repository |
| TypeScript / bundler | **Not used** | No `tsconfig.json`; no webpack/vite/etc. |

**Inferred:** Target runtime is **Chromium-based browsers** that support MV3, `sidePanel`, and the same permission model. **Unknown / Could not verify from code:** Safari/Firefox ports, minimum Chrome version, or Web Store publication status.

---

## 4. Dependency Analysis

### 4.1 Runtime “dependencies”

There are **no npm dependencies**. Runtime relies on:

| API / capability | Role | Primary usage location |
|------------------|------|-------------------------|
| `chrome.storage.local` | Persist products and settings | `shared/storage.js` |
| `chrome.storage.onChanged` | Live UI updates when storage changes | `shared/storage.js` → `addChangeListener`; consumed in `sidebar/sidebar.js` |
| `chrome.runtime.onMessage` | Popup → background command routing | `background/service-worker.js` |
| `chrome.runtime.sendMessage` | Popup invokes background | `popup/popup.js` → `sendRuntimeMessage` |
| `chrome.tabs.query` | Resolve active tab | `popup/popup.js`, `background/service-worker.js` |
| `chrome.tabs.sendMessage` | Background → content script | `background/service-worker.js` → `sendMessageToTab` |
| `chrome.scripting.executeScript` | Inject content script + shared scraper if tab has no listener | `background/service-worker.js` |
| `chrome.sidePanel.open` | Open board UI | `popup/popup.js` |
| `chrome.runtime.openOptionsPage` | Open settings | `popup/popup.js` |
| `chrome.notifications.create` | Welcome + save notifications | `background/service-worker.js` |
| `chrome.runtime.onInstalled` | Initialize settings on install | `background/service-worker.js` |
| `chrome.runtime.getURL` | Resolve notification icon path | `background/service-worker.js` |
| `chrome.tabs.create` | Open product URL from sidebar | `sidebar/sidebar.js` → `openProduct` |
| `navigator.clipboard.writeText` | Copy product link | `sidebar/sidebar.js` → `copyProductLink` |
| DOM / `Intl.NumberFormat` | UI formatting | `popup/popup.js`, `sidebar/sidebar.js` |

### 4.2 Development / tooling

| Tool | Role | Evidence |
|------|------|----------|
| Node.js (`node --check`) | Optional static JS syntax validation | `README.md` Development section |
| **No** ESLint, Prettier, Jest, etc. in repo | N/A | No config files found (only `manifest.json` among `*.json`) |

### 4.3 Potentially “unused” or dormant code paths

| Item | Notes |
|------|--------|
| `AFFILIATE_MAPPINGS` | Used only when `affiliateId` is non-null; all entries are `null`, so `generateAffiliateUrl` in `background/service-worker.js` returns the original URL (by design per docs). |
| `StorageManager.clearAllData` | Defined in `shared/storage.js`; **not referenced** by `options.js` (options uses `clearProducts` only). **Inferred:** Available for future “reset everything” or internal use. |

---

## 5. Architecture Overview

### 5.1 High-level pattern

**Local-first extension monolith** with **shared global namespace** (`UniversalProductBoard`) and **thin UI controllers** (`PopupController`, `SidebarController`, `OptionsController`, `BackgroundService`, `ContentScriptController`).

```text
User on product page
    → Popup opens
    → chrome.runtime.sendMessage(SCRAPE_PRODUCT)
    → Background: active tab + tabs.sendMessage(SCRAPE_PRODUCT)
    → Content: ProductScraper.scrapeProduct()
    → Background: processScrapeResult (normalize, affiliateUrl)
    → Popup: preview

Save click
    → chrome.runtime.sendMessage(SAVE_PRODUCT, productData)
    → Background: normalizeStoredProduct + storage.saveProduct
    → chrome.storage.local updated
    → (optional) notification
    → Sidebar (if open): storage listener → re-render
```

### 5.2 Separation of concerns

| Concern | Location |
|---------|----------|
| Constants, keys, selector lists, affiliate map | `shared/constants.js` |
| Persistence, settings normalization, CRUD | `shared/storage.js` → `StorageManager` |
| Page scraping, confidence, merging strategies | `shared/scraper.js` → `ProductScraper` |
| Message routing, tab scrape orchestration, notifications | `background/service-worker.js` → `BackgroundService` |
| In-page scrape execution, SPA URL observation | `content/content-script.js` |
| Save/preview UX, side panel launch | `popup/popup.js` |
| Board browsing, search/sort/views, context menu | `sidebar/sidebar.js` |
| Export/import/clear, notification toggle | `options/options.js` |

### 5.3 Architectural decisions (explicit in code/docs)

1. **Single source of truth for shared logic** — `shared/*` loaded by manifest content scripts and explicitly by HTML pages; background uses `importScripts('../shared/constants.js', '../shared/storage.js')` (paths relative to worker).
2. **URL-keyed upsert** — `StorageManager.saveProduct` matches `originalUrl` (`shared/storage.js`).
3. **Scrape confidence surfaced to user** — `ProductScraper.determineConfidence` + `meta` object (`shared/scraper.js`); popup shows status and notes (`popup/popup.js`).
4. **Affiliate safety** — all `affiliateId` values `null` until real configuration exists (`shared/constants.js`, `CODEBASE_AUDIT.md`).
5. **Sidebar listens to storage** instead of relying on custom broadcast messages (`sidebar/sidebar.js`, `IMPLEMENTATION_PLAN.md`).

---

## 6. Folder and File Structure Breakdown

```text
universal-product-board/
├── manifest.json                 # MV3 manifest: permissions, entry points
├── shared/
│   ├── constants.js              # STORAGE_KEYS, MESSAGE_TYPES, AFFILIATE_MAPPINGS, SCRAPER_SELECTORS, DEFAULT_SETTINGS, PRICE_CURRENCY_MAP
│   ├── storage.js                # StorageManager, chrome.storage.local wrapper
│   └── scraper.js                # ProductScraper class
├── background/
│   └── service-worker.js         # BackgroundService: messages, scrape/save, notifications
├── content/
│   └── content-script.js         # ContentScriptController + ProductScraper usage
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js                  # PopupController
├── sidebar/
│   ├── sidebar.html
│   ├── sidebar.css
│   └── sidebar.js                # SidebarController
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js                # OptionsController
├── assets/icons/
│   ├── icon.svg, icon16.png, icon48.png, icon128.png
│   ├── icon16.txt, icon48.txt, icon128.txt   # Non-runtime; likely placeholders/notes
│   └── README.md
├── README.md
├── CHANGELOG.md
├── CODEBASE_AUDIT.md
├── IMPLEMENTATION_PLAN.md
├── TESTING_REPORT.md
└── PROJECT_FULL_ANALYSIS.md      # This file
```

**Conventions:** Lowercase folder names; `*Controller` / `*Service` classes for entry logic; global `UniversalProductBoard` namespace populated by IIFEs.

---

## 7. Product Purpose and Problem Solved

**Stated intent:** Help users **collect product information from many e-commerce sites** into **one local board** without maintaining separate wishlists per retailer (`README.md`, `manifest.json` description).

**Problems addressed (from code behavior):**

- **Fragmented saving flow** — unified “save from current tab” via extension popup.
- **Weak or inconsistent page metadata** — layered scraper (site-specific → JSON-LD → microdata → Open Graph → generic selectors) with explicit confidence levels (`shared/scraper.js`).
- **Duplicate entries for same URL** — upsert by `originalUrl` (`shared/storage.js`).
- **Visibility of saved items** — side panel board with search/sort/views (`sidebar/sidebar.js`).
- **Data portability** — JSON export/import (`shared/storage.js`, `options/options.js`).
- **Privacy-by-architecture** — no network calls for core features in this codebase; data in `chrome.storage.local`.

**Likely users:** Online shoppers, deal hunters, or researchers comparing products across sites. **Inferred** from feature set only; no personas in code.

---

## 8. User Roles and Primary Workflows

**Roles:** There is **no authentication**; a single browser profile’s storage is the scope. Effectively one implicit role: **the extension user**.

| Workflow | Steps | Key files |
|----------|--------|-----------|
| First install | Extension installed → `onInstalled` resets settings to defaults, welcome notification | `background/service-worker.js` → `handleInstallation` |
| Preview product | Open product page → click extension icon → popup loads tab, sends `SCRAPE_PRODUCT` → preview | `popup/popup.js`, `background/service-worker.js`, `content/content-script.js`, `shared/scraper.js` |
| Save / update | Click save → `SAVE_PRODUCT` with scraped product → storage upsert → optional notification | `popup/popup.js`, `background/service-worker.js`, `shared/storage.js` |
| View board | “View Board” / “View All” → `chrome.sidePanel.open` | `popup/popup.js` |
| Browse / filter | Search input, sort menu, grid/list toggles | `sidebar/sidebar.js`, `sidebar/sidebar.html` |
| Open product | Click card → `chrome.tabs.create` with `affiliateUrl \|\| originalUrl` | `sidebar/sidebar.js` → `openProduct` |
| Context actions | Right-click card → open / copy / delete | `sidebar/sidebar.js` |
| Settings | Footer “Settings” → `openOptionsPage` | `popup/popup.js`, `options/*` |
| Backup / restore | Export JSON / import JSON / clear products | `options/options.js`, `shared/storage.js` |

---

## 9. Full Feature Inventory

| Feature | Status | Implementation notes |
|---------|--------|----------------------|
| Scrape active tab from popup | Implemented | `SCRAPE_PRODUCT` pipeline |
| Scrape on `http`/`https` only | Implemented | `isSupportedUrl` in `popup/popup.js`, `background/service-worker.js` |
| Preview name, price, image, site | Implemented | `popup/popup.js` → `showProductPreview` |
| Confidence / limited-data messaging | Implemented | `meta.confidence`, `buildPreviewNote` |
| Save new product | Implemented | `SAVE_PRODUCT` |
| Update existing by URL | Implemented | `StorageManager.saveProduct` |
| Product count in popup | Implemented | `loadProductCount` |
| Open side panel | Implemented | `chrome.sidePanel.open` |
| Board: grid/list | Implemented | `setView` |
| Board: sort (newest, oldest, name, price) | Implemented | `applySorting` |
| Board: search | Implemented | `applyFilters` |
| Board: live refresh on storage change | Implemented | `handleStorageChange` |
| Manual refresh button | Implemented | `loadProducts` |
| Context menu: open, copy, delete | Implemented | `handleContextMenuAction` |
| Toast feedback | Implemented | `showToast` |
| Options: notification toggle | Implemented | `show-notifications` checkbox |
| Options: export | Implemented | `exportData` → download |
| Options: import | Implemented | `importData` (replaces products + settings) |
| Options: clear products | Implemented | `clearProducts` |
| Install / save notifications | Implemented | `chrome.notifications` (gated by `showNotifications`) |
| Affiliate link rewriting | **Disabled** (IDs null) | `generateAffiliateUrl` |
| Multi-board | **Not implemented** | Documented gap in `README.md` |
| Auto-save | **Not implemented** | Removed from settings schema per `TESTING_REPORT.md` |
| Automated tests | **Not present** | `TESTING_REPORT.md` |

---

## 10. Pages / Routes / Screens Breakdown

This is **not** a web app with HTTP routes. Surfaces are **extension UI entry points** and **injected script context**.

| Surface | Entry | Purpose | Major UI sections | Auth |
|---------|-------|---------|---------------------|------|
| **Popup** | `browser_action` → `popup/popup.html` | Scan page, preview, save/update, open board, link to settings | Header + status; actions; product preview; messages; footer stats/links | None |
| **Side panel** | `side_panel.default_path` → `sidebar/sidebar.html` | Full product board | Header (refresh, sort, close); search; product grid/list; empty/loading; context menu; toast | None |
| **Options** | `options_ui.page` → `options/options.html` | Preferences + data tools | Preferences toggle; export/import/clear; status | None |
| **Content script** | Injected per `manifest.json` `content_scripts` on `http(s)://*/*` | Respond to scrape messages | No visible UI | N/A |
| **Background** | `background/service-worker.js` | Event-driven worker | No UI | N/A |

**Dynamic behavior:** Content script **singleton** — if `window.__UPB_CONTENT_CONTROLLER__` exists, `handleUrlChange()` is called instead of creating a new controller (`content/content-script.js`). **SPA navigation** detected via `MutationObserver` comparing `location.href`.

**Error / empty states:** Popup shows unsupported message; sidebar shows empty states for no products and no search matches; options shows status banner on actions.

---

## 11. API / Backend Breakdown

**No HTTP API, no server, no serverless functions** in this repository.

The only “API” is **Chrome extension message types** defined in `shared/constants.js`:

| Message type | Sender | Handler | Response payload (success) |
|--------------|--------|---------|----------------------------|
| `SCRAPE_PRODUCT` | Popup (via runtime) | `BackgroundService.handleScrapeProduct` → content script | `{ data: { product, meta } }` after `processScrapeResult` |
| `SAVE_PRODUCT` | Popup | `BackgroundService.handleSaveProduct` | `{ data: { created, updated, product } }` from `storage.saveProduct` |

**Internal content script message:** Same `SCRAPE_PRODUCT` string is sent **from background to tab** (`background/service-worker.js`); `ContentScriptController` only handles that type (`content/content-script.js`).

**Validation / errors:** Missing `originalUrl` throws in background save handler; unsupported URLs throw on scrape; failures return `{ success: false, error }` from background listener wrapper.

---

## 12. Database and Data Model Breakdown

**No SQL/NoSQL database.** Persistence is **`chrome.storage.local`** key-value store.

### 12.1 Storage keys (`shared/constants.js`)

| Key constant | Storage key string | Content |
|--------------|-------------------|---------|
| `STORAGE_KEYS.PRODUCTS` | `'products'` | Array of product objects |
| `STORAGE_KEYS.SETTINGS` | `'settings'` | Settings object |

### 12.2 Settings schema (`shared/storage.js`)

- `normalizeSettings` merges with `DEFAULT_SETTINGS` from `shared/constants.js`: `{ showNotifications: true }` default; `showNotifications` treated as true unless explicitly `false`.

### 12.3 Product shape (synthesized from code)

Fields set or preserved by `StorageManager.saveProduct` and `BackgroundService.normalizeStoredProduct`:

| Field | Source / notes |
|-------|----------------|
| `id` | Generated on create: `product_${Date.now()}_${random}` (`generateProductId`) |
| `originalUrl` | Required for save; used as upsert key |
| `name` | Scraped / cleaned; fallback `'Unknown Product'` in background normalization |
| `price` | String numeric in scraper/storage pipeline; displayed via `Intl` |
| `currency` | From scraper or hostname defaults |
| `imageUrl` | Normalized HTTPS in several layers |
| `affiliateUrl` | From `generateAffiliateUrl` (currently equals `originalUrl` when no affiliate ID) |
| `website` | Hostname derived from URL |
| `scrapedAt` | Timestamp from `processScrapeResult` |
| `dateSaved` | Set on create; preserved on update |
| `dateUpdated` | Updated on each save |

**Relationships:** Flat array only — **no foreign keys**, **no multi-board**.

**Migrations:** None. **Import** overwrites products and normalizes settings (`importData`).

**Integrity:** Application-level only; no schema enforcement beyond array checks and `originalUrl` requirement on save.

---

## 13. Authentication and Authorization

**Not applicable** — no users, sessions, JWTs, or OAuth in codebase.

**Authorization model:** Any code running in the extension with access to `chrome.storage.local` can read/write data. **Browser profile boundary** is the security boundary.

**Security assumptions visible in code:**

- Scraped strings assigned via `textContent` in sidebar cards (mitigates HTML injection from scraped data into DOM) (`sidebar/sidebar.js` → `createProductCard`).
- Popup preview uses `textContent` for text fields (`popup/popup.js`).
- **Host permissions** are broad: `https://*/*`, `http://*/*` (`manifest.json`) — required for universal scraping but increases attack surface if combined with unsafe DOM patterns (historically noted in `CODEBASE_AUDIT.md` for pre-v1.1 `innerHTML` usage).

---

## 14. State Management and Data Flow

| State type | Mechanism | Location |
|------------|-----------|----------|
| Persistent | `chrome.storage.local` | `StorageManager` |
| Popup ephemeral | Class fields on `PopupController` | `scrapeResult`, `existingProduct`, `currentTab` |
| Sidebar ephemeral | Class fields on `SidebarController` | `products`, `filteredProducts`, `currentView`, `currentSort`, `searchQuery` |
| Cross-UI sync | `chrome.storage.onChanged` | `SidebarController.handleStorageChange` |
| Scraping | In-page `ProductScraper` instance | `ContentScriptController` |

**Server state:** None.

**Forms:** No React/form library; native checkbox and file input in options (`options/options.js`).

**Loading / errors:** Popup uses `setLoading`, `setStatus`, `showMessage`; sidebar uses loading div and toasts; options uses `showStatus`.

**Optimistic updates:** Not used; sidebar waits for storage writes (delete uses `storage.deleteProduct` then relies on `onChanged` or local state update via listener).

---

## 15. UI / Component System

**No React/Vue/Svelte** — vanilla DOM.

| Area | Approach | Files |
|------|----------|-------|
| Layout | Semantic HTML sections | `*.html` |
| Styling | CSS variables, flex/grid, dark mode via `prefers-color-scheme` | `*.css` |
| Components | Not formalized; repeated patterns in single files | N/A |
| Icons | Inline SVG in HTML | `popup/popup.html`, `sidebar/sidebar.html`, `options` (minimal) |
| Accessibility | Partial: `alt` on images, some `title` on buttons; **no comprehensive ARIA audit performed** | **Unknown / Could not verify** full WCAG compliance without manual audit |
| Responsiveness | Fixed widths (popup 320px; sidebar `--sidebar-width: 400px`) with small breakpoints | CSS files |

**Maintainability:** UI logic is concentrated in single large controllers (`sidebar/sidebar.js` ~470 lines, `shared/scraper.js` ~800+ lines). No design-system package; visual styles differ somewhat between popup (zinc-like neutrals) and sidebar (indigo accent).

---

## 16. External Integrations

| Integration | Present? | Details |
|-------------|----------|---------|
| Payment | No | — |
| Analytics | No | Explicitly noted as absent in `CODEBASE_AUDIT.md` |
| Remote API / AI | No | — |
| Email / auth provider | No | — |
| E-commerce sites | Read-only DOM scraping | Site-specific logic for Amazon, Etsy, eBay, Walmart in `ProductScraper` |

**Affiliate programs:** Mapping table exists but **inactive** until `affiliateId` set (`shared/constants.js`, `background/service-worker.js`).

---

## 17. Config / Environment / Build / Deployment

| Topic | Finding |
|-------|---------|
| Environment variables | **None** in repo |
| `.env` | **Not present** |
| Build | **None** — load unpacked per `README.md` |
| CI/CD | **No** workflow files found in repository |
| Docker | **No** |
| Deployment | **Inferred:** Developer/test via `chrome://extensions` → Load unpacked; production path would be Chrome Web Store zip (not scripted here) |
| Versioning | `manifest.json` `version`: `1.1.0`; export metadata uses same (`shared/storage.js` → `exportData`) |

**Static checks:** `node --check` on all JS files — **verified in this analysis session** (exit code 0).

---

## 18. Important File-by-File Notes

| File | Responsibility |
|------|----------------|
| `manifest.json` | MV3 config: permissions `activeTab`, `storage`, `scripting`, `sidePanel`, `notifications`; broad host permissions; registers background worker, content scripts (load order: `constants.js`, `scraper.js`, `content-script.js`), popup, options, side panel, icons. |
| `shared/constants.js` | Defines `UniversalProductBoard` keys, message types, selector lists, `DEFAULT_SETTINGS`, `PRICE_CURRENCY_MAP`, `AFFILIATE_MAPPINGS` (all `affiliateId: null`). |
| `shared/storage.js` | `StorageManager`: get/set/remove; settings normalization; `getProducts`, `getProductByUrl`, `saveProduct`, `deleteProduct`, `clearProducts`, `clearAllData`, `exportData`, `importData`, `addChangeListener`. |
| `shared/scraper.js` | `ProductScraper`: full scrape pipeline, site-specific extractors (`scrapeAmazon`, `scrapeEtsy`, etc.), JSON-LD/microdata/OG/generic paths, confidence calculation, URL/image normalization. |
| `background/service-worker.js` | `BackgroundService`: message switch for `SCRAPE_PRODUCT` / `SAVE_PRODUCT`; tab messaging + inject on missing receiver; `processScrapeResult`, `normalizeStoredProduct`, `generateAffiliateUrl`; notifications. |
| `content/content-script.js` | Singleton controller; `MutationObserver` for URL changes; handles `SCRAPE_PRODUCT` via `scraper.scrapeProduct()`. |
| `popup/popup.js` | `PopupController`: init tab, preview via background message, save, open side panel, product count from storage, status UI. |
| `sidebar/sidebar.js` | `SidebarController`: load products, storage subscription, search/sort/view, card DOM creation, context menu, clipboard, delete, open tab. |
| `options/options.js` | `OptionsController`: settings load/save, export/import file handling, clear products, status text. |
| `README.md` | User-facing overview, structure, limitations. |
| `CODEBASE_AUDIT.md` | Pre-1.1 issues and fixes narrative. |
| `IMPLEMENTATION_PLAN.md` | Phased fix list mapped to files. |
| `TESTING_REPORT.md` | Static validation scope + manual QA checklist. |
| `CHANGELOG.md` | v1.1.0 change list. |

---

## 19. Strengths of the Current Codebase

1. **Clear consolidation** of shared logic under `shared/` with explicit load ordering and constructor guard in `StorageManager` / `ProductScraper` if constants missing.
2. **Honest scrape UX** — confidence levels and “limited data” path instead of hard-blocking saves (`popup/popup.js`, `shared/scraper.js`).
3. **URL upsert** prevents duplicate board entries for same product URL (`shared/storage.js`).
4. **Live sidebar** updates via `chrome.storage.onChanged` — robust cross-surface sync without custom event bus (`sidebar/sidebar.js`).
5. **Safer sidebar rendering** — DOM APIs + `textContent` instead of string HTML for product fields (`sidebar/sidebar.js`).
6. **Affiliate disabling by default** avoids silent URL mutation (`shared/constants.js`).
7. **SPA-aware content script** — singleton + `scraper.refresh()` on URL change reduces duplicate listeners (`content/content-script.js`).
8. **Documented history** — audit, implementation plan, testing report, changelog align with code structure.

---

## 20. Weaknesses / Risks / Tech Debt

| Area | Risk | Severity |
|------|------|----------|
| Broad host permissions | Justified for scraping, but increases responsibility to keep content script minimal and safe | Medium |
| `MutationObserver` on full `document` subtree | May run frequently on dynamic pages; performance **unknown** without profiling | Low–Medium |
| Large monolithic files | `shared/scraper.js` and `sidebar/sidebar.js` are long; harder to test and navigate | Low |
| No automated tests | Regressions rely on manual QA (`TESTING_REPORT.md`) | Medium |
| `chrome.sidePanel` / MV3 specifics | Not portable to all browsers; side panel behavior **Inferred** Chrome/Edge-centric | Medium |
| Clipboard API | May fail on restricted pages or permissions; handled with toast error (`sidebar/sidebar.js`) | Low |
| `clearAllData` unused in UI | Dead feature path from user perspective | Low |
| Icon `.txt` files in `assets/icons/` | Possible confusion alongside `.png` / `.svg` | Low |

---

## 21. Incomplete / Unclear / Inferred Areas

| Topic | Status |
|-------|--------|
| Chrome Web Store release | **Unknown / Could not verify from code** |
| Minimum Chrome version | **Unknown** — not declared in manifest |
| Runtime performance on heavy SPAs | **Unknown** without browser profiling |
| Full accessibility compliance | **Unknown** — not systematically documented |
| Whether `icon*.txt` are required for build | **Inferred:** No — PNG/SVG are referenced by manifest; `.txt` appear ancillary |
| Future affiliate UI | Documented as deferred (`IMPLEMENTATION_PLAN.md`, `README.md`) |
| Multi-board, auto-save, price tracking | Explicitly not implemented (`README.md`, `CODEBASE_AUDIT.md`) |

**Unverified without running Chrome:** End-to-end scrape accuracy per retailer, notification permission prompts, side panel open failures on unsupported builds.

---

## 22. Glossary of Important Internal Terms

| Term | Meaning |
|------|---------|
| `UniversalProductBoard` | Global namespace object aggregating constants, classes, and `storageManager` singleton |
| `SCRAPE_PRODUCT` | Message type: request full scrape of active tab’s DOM |
| `SAVE_PRODUCT` | Message type: persist product payload via background |
| `StorageManager` | Class wrapping `chrome.storage.local` operations |
| `ProductScraper` | Class encapsulating all extraction strategies |
| `meta.confidence` | `'high' \| 'medium' \| 'low' \| 'none'` scrape quality indicator |
| `meta.strategy` | Which extraction pass dominated (e.g. `json-ld`, `site-specific`, `fallback`) |
| `affiliateUrl` | URL potentially rewritten with affiliate query param; equals original when disabled |
| `originalUrl` | Canonical key for upsert and identity |
| Side panel | Chrome UI surface hosting `sidebar/sidebar.html` |

---

## 23. Concise “Explain This Project to Another LLM” Summary

**What it is:** Universal Product Board is a **Manifest V3 Chrome extension (v1.1.0)** with **no build step and no npm dependencies**. It lets users on **http/https pages** extract **product-like fields** (title, price, currency, image, URL, site name) using an in-tab **content script** running **`ProductScraper`** (`shared/scraper.js`), preview results in **`popup/popup.js`**, and save/update records in **`chrome.storage.local`** via **`StorageManager`** (`shared/storage.js`). Saved items appear in a **side panel** UI (`sidebar/sidebar.js`, `chrome.sidePanel.open` from popup) with **search, sort, grid/list views**, **context menu** (open in new tab, copy link, delete), and **live refresh** via **`chrome.storage.onChanged`**. A full-tab **options** page (`options/options.js`) toggles **save notifications**, **exports/imports JSON**, and **clears products**.

**How it is structured:** **`manifest.json`** registers the service worker (`background/service-worker.js`), content scripts (load **`shared/constants.js`**, **`shared/scraper.js`**, **`content/content-script.js`**), popup, options, and side panel. **`shared/constants.js`** defines **`STORAGE_KEYS`**, **`MESSAGE_TYPES`**, **`SCRAPER_SELECTORS`**, **`AFFILIATE_MAPPINGS`** (all `affiliateId: null`), **`DEFAULT_SETTINGS`**. The background **`BackgroundService`** handles only **`SCRAPE_PRODUCT`** and **`SAVE_PRODUCT`**: it messages the active tab, **injects** scripts with **`chrome.scripting.executeScript`** if no listener exists, normalizes scrape results (**`processScrapeResult`**, **`normalizeStoredProduct`**), applies **`generateAffiliateUrl`** (no-op while IDs null), saves through storage, and shows **`chrome.notifications`** on **new** saves when enabled. The content script uses a **singleton** **`ContentScriptController`** with **`MutationObserver`**-based URL change detection for SPAs.

**Main features:** Universal scrape pipeline (site-specific Amazon/Etsy/eBay/Walmart + JSON-LD + microdata + Open Graph + generic selectors), confidence-aware popup messaging, **URL-keyed upsert**, side panel board UX, export/import, local-only privacy model, optional notifications.

**Main patterns:** Global **`UniversalProductBoard`** namespace from IIFEs; **promise-style** `chrome.runtime.sendMessage` wrapping in popup; **class-based** controllers; **no React**; **flat product array** persistence.

**Main gaps / risks:** **No backend, auth, or multi-user** support; **no automated tests**; **broad host permissions**; **affiliate/multi-board/auto-save** not implemented; **Chrome side panel / MV3** coupling; **manual browser QA** still required to validate real-world scraping and permissions behavior.

---

*End of PROJECT_FULL_ANALYSIS.md*
