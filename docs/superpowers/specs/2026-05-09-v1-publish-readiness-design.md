# Universal Product Board V1 Publish Readiness Design

## Goal
Make the existing extension publish-ready for a Chrome Web Store v1 launch without changing its core product scope. Preserve the current feature set, harden policy/privacy/security edges, improve clarity and trust, and produce the required repository-based launch materials and visual assets.

## Product Scope

### In Scope
- Popup product scan, preview, save, and update flow
- Side panel board browsing with search, sort, and layout toggle
- Optional Live Save flow in the side panel
- Optional notifications
- Export/import and clear-data controls
- Donation/support UI, kept secondary to the core value proposition
- Store listing copy, privacy/support/reviewer artifacts, and Chrome Web Store images

### Out of Scope
- Accounts or cloud sync
- Backend services or APIs
- Analytics or user tracking
- Affiliate monetization rollout
- Real price tracking or alerts
- Major architectural rewrites

## Publishability Standard
The release should satisfy these standards:
- Accurate single-purpose product description
- Manifest V3 compliance with justified permissions
- Clear least-privilege explanations for optional permissions
- Safer local data handling for imported content and saved URLs
- In-product privacy disclosures aligned with the real runtime behavior
- Complete repository artifacts for listing, privacy, support, and reviewer context
- Truthful polished listing images derived from the real UI

## Current Product Definition
Universal Product Board is a local-first browser utility that helps users save and organize product pages from shopping sites into one browser-side board. The product promise should be phrased as:

> Save and organize products from shopping pages into one local browser board.

The release must stop implying unsupported capabilities such as automated product tracking, price monitoring, cloud sync, or background collection.

## Technical Design

### 1. Manifest And Product Language Alignment
- Keep the existing MV3 manifest structure and permission model.
- Replace misleading “track” language with “save,” “organize,” “review,” and “browse.”
- Keep `activeTab`, `storage`, `scripting`, and `sidePanel` as required permissions.
- Keep `notifications` and all-sites website access optional.
- Align manifest description, README, submission copy, reviewer notes, and UI copy so they describe the same product behavior.

### 2. Local Data Hardening
- Treat imported JSON as untrusted input.
- Validate imported product objects before saving them.
- Normalize only the supported fields:
  - `name`
  - `price`
  - `currency`
  - `imageUrl`
  - `originalUrl`
  - `affiliateUrl`
  - `website`
  - `dateSaved`
  - `dateUpdated`
- Reject invalid or unusable records instead of storing arbitrary objects.
- Restrict saved/opened product URLs to valid `http` or `https` URLs.
- Avoid allowing unsupported schemes to flow into `chrome.tabs.create`, saved board data, or exports.

### 3. Privacy And Permission Clarity
- Keep the extension local-first with no remote API calls or analytics.
- Make the UI more explicit about:
  - page access only happening when the user initiates it
  - Live Save only reading the active tab after optional permission grant
  - saved products staying in browser-local extension storage
  - product preview images possibly loading from merchant/CDN URLs
- Improve permission explanation copy in product surfaces and store artifacts so Chrome reviewers can map each permission to a visible feature.

### 4. Live Save Trust Hardening
- Keep the optional `http://*/*` and `https://*/*` host access model for v1.
- Improve the side panel gate state so it better explains:
  - why access is needed
  - what changes when access is granted
  - that access is optional and scoped to the active-tab Live Save experience
- Preserve graceful behavior when permission is denied or removed.

### 5. UX Cleanup
- Remove stale release/version language.
- Improve empty/error/help text to feel more polished and public-ready.
- Keep donation/support messaging present but secondary.
- Ensure privacy/value copy leads and donation/support copy follows.

### 6. Release Artifacts
Create or finish repository artifacts for:
- store listing copy
- reviewer notes
- support/contact material
- privacy policy source text
- launch checklist
- generated Chrome Web Store images

The repository will contain artifacts only. External hosting/deployment is explicitly out of scope for this pass.

## Visual Asset Design

### Visual Direction
The store images should look cleaner and more intentional than raw screenshots while remaining truthful to the actual product. They should present:
- the popup save flow
- the side panel board
- the settings/privacy/data controls
- the local-first and optional-permission story

### Asset Principles
- No invented features
- No fake dashboards or analytics
- No fabricated cross-device sync or tracking claims
- Use the actual extension structure, copy, and UI hierarchy as source truth
- Allow marketing polish: refined framing, cleaner staging, stronger color contrast, product-page backdrop context, and clearer feature callouts

### Planned Deliverables
- At least 3 screenshot-style Web Store images
- 1 small promotional image
- Optional extra polished variants for reuse in docs or future listing iterations

## Verification Design

### Automated/Static Verification
- Run the existing release validation script
- Run the existing packaging script
- Run `node --check` across runtime JS files
- Inspect the final ZIP contents
- Verify the added repo artifacts exist at the expected paths

### Manual-Only Verification
Because this environment does not provide a real interactive Chrome session, manual Chrome QA remains a separate checklist item. The release materials should clearly distinguish:
- verified static/package checks
- remaining manual browser checks

No claim should be made that interactive Chrome QA was completed unless it actually was.

## File And Change Strategy

### Likely Files To Modify
- `manifest.json`
- `shared/storage.js`
- `background/service-worker.js`
- `popup/popup.html`
- `popup/popup.js`
- `sidebar/sidebar.html`
- `sidebar/sidebar.js`
- `options/options.html`
- `README.md`
- `CHROME_WEB_STORE_SUBMISSION.md`
- `PRIVACY_POLICY.md`
- `privacy-policy.html`
- `RELEASE_CHECKLIST.md`
- `TESTING_REPORT.md`

### Files To Add
- `SUPPORT.md`
- `CHROME_WEB_STORE_LISTING.md`
- generated image assets under `assets/store/`

## Risks And Decisions

### Accepted V1 Constraints
- Optional all-sites host access remains broad for Live Save
- No automated test suite will be invented unless needed for a specific hardening change
- The existing no-build architecture remains intact

### Main Risks To Mitigate
- Reviewer confusion about the extension’s purpose
- Store rejection due to incomplete privacy/listing artifacts
- Unsafe handling of imported URLs/data
- User distrust caused by unclear permission or donation messaging

## Success Criteria
The work is successful when:
- the extension’s code and copy reflect one clear v1 purpose
- the known launch blockers from the audit are addressed in code or repo artifacts
- the project re-validates with its existing scripts
- the repository contains the needed listing, privacy, support, and image assets
- the final handoff clearly separates what is publish-ready from any remaining manual QA tasks
