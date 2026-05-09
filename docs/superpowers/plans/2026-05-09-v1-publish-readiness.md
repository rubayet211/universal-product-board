# Universal Product Board V1 Publish Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current extension publish-ready for a Chrome Web Store v1 launch by hardening code paths, aligning product/privacy language, adding release artifacts, and generating truthful polished store images.

**Architecture:** Keep the no-build Manifest V3 structure intact. Modify only the existing runtime modules and docs needed for compliance, trust, and release readiness. Add repository-only listing/support/image assets without introducing backend services or new runtime dependencies.

**Tech Stack:** Chrome Extension Manifest V3, plain JavaScript, HTML/CSS, PowerShell release scripts, local repository artifacts, built-in image generation.

---

### Task 1: Harden Runtime Data And Permission UX

**Files:**
- Modify: `manifest.json`
- Modify: `shared/storage.js`
- Modify: `background/service-worker.js`
- Modify: `popup/popup.html`
- Modify: `popup/popup.js`
- Modify: `sidebar/sidebar.html`
- Modify: `sidebar/sidebar.js`
- Modify: `options/options.html`

- [ ] **Step 1: Update manifest and user-facing product language**

Expected changes:

```json
{
  "description": "Save and organize products from shopping pages into one local board"
}
```

Also remove stale or misleading “track”/version copy from the UI.

- [ ] **Step 2: Add URL sanitization and import validation in shared storage**

Expected implementation shape:

```js
sanitizeProductUrl(url) {
  const parsed = new URL(String(url));
  if (!/^https?:$/i.test(parsed.protocol)) {
    return null;
  }
  return parsed.toString();
}
```

```js
normalizeImportedProduct(product) {
  return {
    name: this.normalizeProductName(product?.name),
    price: this.normalizeProductPrice(product?.price),
    currency: this.normalizeCurrency(product?.currency),
    imageUrl: this.normalizeImageUrl(product?.imageUrl),
    originalUrl: this.sanitizeProductUrl(product?.originalUrl),
    affiliateUrl: this.sanitizeProductUrl(product?.affiliateUrl) || this.sanitizeProductUrl(product?.originalUrl),
    website: this.normalizeWebsite(product?.website, product?.originalUrl),
    dateSaved: this.normalizeTimestamp(product?.dateSaved),
    dateUpdated: this.normalizeTimestamp(product?.dateUpdated)
  };
}
```

- [ ] **Step 3: Ensure save/open flows reject unsafe URLs**

Expected behavior:
- background save path rejects products missing a valid `originalUrl`
- sidebar open/copy paths only act on valid `http/https` URLs
- import rejects unusable rows and reports useful counts/errors

- [ ] **Step 4: Improve privacy and Live Save explanation copy in popup/sidebar/options**

Expected content direction:

```text
This extension reads the current page only when you ask it to.
Live Save is optional and only follows the active tab after you grant website access.
Product previews may load images directly from merchant or CDN hosts.
```

- [ ] **Step 5: Run syntax validation for edited runtime files**

Run:

```powershell
node --check shared/storage.js
node --check background/service-worker.js
node --check popup/popup.js
node --check sidebar/sidebar.js
```

Expected: all commands exit `0`.

### Task 2: Finish Publish Artifacts

**Files:**
- Modify: `README.md`
- Modify: `CHROME_WEB_STORE_SUBMISSION.md`
- Modify: `PRIVACY_POLICY.md`
- Modify: `privacy-policy.html`
- Modify: `RELEASE_CHECKLIST.md`
- Modify: `TESTING_REPORT.md`
- Add: `CHROME_WEB_STORE_LISTING.md`
- Add: `SUPPORT.md`

- [ ] **Step 1: Align repository docs to the actual v1 promise**

Expected messaging:

```text
Save and organize products from shopping pages into one local browser board.
```

Remove unsupported “tracking” implications and stale release references.

- [ ] **Step 2: Add final listing copy artifact**

`CHROME_WEB_STORE_LISTING.md` should include:
- short description
- detailed description
- permission justifications
- privacy disclosure summary
- reviewer notes
- suggested category
- release notes

- [ ] **Step 3: Add support/contact artifact**

`SUPPORT.md` should include:
- support purpose
- support email placeholder/instruction
- troubleshooting bullets
- privacy-policy artifact references
- manual QA note

- [ ] **Step 4: Update privacy artifacts with remote image disclosure**

Expected privacy copy addition:

```text
When product previews are shown, image URLs from merchant or CDN hosts may load directly in the extension UI so the user can preview the product image.
```

- [ ] **Step 5: Re-read docs for internal consistency**

Check that manifest wording, README, listing copy, reviewer notes, privacy docs, and support docs all describe the same feature set and permission model.

### Task 3: Generate Chrome Web Store Assets

**Files:**
- Add: `assets/store/screenshot-01-popup-save-flow.png`
- Add: `assets/store/screenshot-02-side-panel-board.png`
- Add: `assets/store/screenshot-03-settings-privacy.png`
- Add: `assets/store/promo-small-440x280.png`
- Add: `assets/store/README.md`

- [ ] **Step 1: Define truthful visual prompts based on the real UI**

Prompt themes:
- popup save flow on a shopping page
- side panel board with current-page card and saved products
- settings/privacy/data control page
- promo composition emphasizing “local-first” and “save products fast”

- [ ] **Step 2: Generate polished marketing mockups from the real UI structure**

Constraints:
- no invented features
- no analytics or sync screens
- no fake price alerts
- maintain actual product naming and real available controls

- [ ] **Step 3: Save project-bound outputs under `assets/store/`**

Expected asset inventory:

```text
assets/store/screenshot-01-popup-save-flow.png
assets/store/screenshot-02-side-panel-board.png
assets/store/screenshot-03-settings-privacy.png
assets/store/promo-small-440x280.png
assets/store/README.md
```

- [ ] **Step 4: Document how each image maps to the real product**

`assets/store/README.md` should state:
- what each image represents
- which extension surface it is based on
- which claims/callouts are safe to use in the store listing

### Task 4: Verify Release Output

**Files:**
- Modify as needed from previous tasks

- [ ] **Step 1: Run full release validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1
```

Expected: `Release validation passed.`

- [ ] **Step 2: Rebuild the extension package**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-extension.ps1
```

Expected: `Created package: ...universal-product-board-1.3.0.zip`

- [ ] **Step 3: Run complete syntax verification**

Run:

```powershell
node --check shared/constants.js
node --check shared/storage.js
node --check shared/scraper.js
node --check background/service-worker.js
node --check content/content-script.js
node --check popup/popup.js
node --check sidebar/sidebar.js
node --check options/options.js
```

Expected: all commands exit `0`.

- [ ] **Step 4: Inspect final ZIP contents**

Run:

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip='dist/universal-product-board-1.3.0.zip'
$archive=[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $zip))
try { $archive.Entries | Select-Object FullName,Length } finally { $archive.Dispose() }
```

Expected: runtime files only; no store-only artifacts accidentally packaged.

- [ ] **Step 5: Report remaining manual-only QA honestly**

Final report must separate:
- completed static validation
- generated repo artifacts
- remaining manual Chrome checks
