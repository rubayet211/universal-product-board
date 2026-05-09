# Theme Preference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-selectable `System` / `Light` / `Dark` theme preference for the full extension UI and improve dark-mode contrast so text remains readable across popup, side panel, and options.

**Architecture:** Extend the shared settings schema with a `theme` value, add one shared theme runtime that resolves and applies the active theme via `data-theme` on `document.documentElement`, and update popup/sidebar/options CSS to use explicit light and dark theme variables instead of relying only on `prefers-color-scheme`. The options page owns the selector UI and persists changes through the existing storage manager.

**Tech Stack:** Manifest V3 Chrome extension, plain JavaScript, plain CSS, `chrome.storage.local`, existing PowerShell validation/package scripts.

---

## File Structure

- Modify: `H:/Extension/universal-product-board/shared/constants.js`
  - Add `theme: 'system'` to the shared default settings.
- Modify: `H:/Extension/universal-product-board/shared/storage.js`
  - Normalize and persist the new `theme` setting safely.
- Create: `H:/Extension/universal-product-board/shared/theme.js`
  - Shared theme runtime that resolves `system`, applies `data-theme`, and listens for system theme changes when appropriate.
- Modify: `H:/Extension/universal-product-board/popup/popup.html`
  - Load `shared/theme.js` before `popup.js`.
- Modify: `H:/Extension/universal-product-board/sidebar/sidebar.html`
  - Load `shared/theme.js` before `sidebar.js`.
- Modify: `H:/Extension/universal-product-board/options/options.html`
  - Add theme selector UI and load `shared/theme.js` before `options.js`.
- Modify: `H:/Extension/universal-product-board/options/options.js`
  - Read the saved theme, populate the selector, save updates, and reapply theme immediately.
- Modify: `H:/Extension/universal-product-board/popup/popup.css`
  - Convert to explicit theme variables and improve dark-mode text/surface contrast.
- Modify: `H:/Extension/universal-product-board/sidebar/sidebar.css`
  - Convert to explicit theme variables and improve dark-mode text/surface contrast.
- Modify: `H:/Extension/universal-product-board/options/options.css`
  - Add theme selector styling, explicit theme variables, and stronger dark contrast.

## Task 1: Extend the shared settings schema

**Files:**
- Modify: `H:/Extension/universal-product-board/shared/constants.js`
- Modify: `H:/Extension/universal-product-board/shared/storage.js`

- [ ] **Step 1: Add the new default setting key**

Update `DEFAULT_SETTINGS` in `H:/Extension/universal-product-board/shared/constants.js` so it includes:

```js
const DEFAULT_SETTINGS = {
  showNotifications: false,
  showDonationReminders: true,
  theme: 'system'
};
```

- [ ] **Step 2: Normalize the new setting in storage**

Update `normalizeSettings(settings)` in `H:/Extension/universal-product-board/shared/storage.js` so only valid values survive:

```js
normalizeSettings(settings) {
  const validThemes = new Set(['system', 'light', 'dark']);
  const requestedTheme = typeof settings?.theme === 'string'
    ? settings.theme.toLowerCase()
    : DEFAULT_SETTINGS.theme;

  return {
    ...DEFAULT_SETTINGS,
    showNotifications: settings?.showNotifications === true,
    showDonationReminders: settings?.showDonationReminders !== false,
    theme: validThemes.has(requestedTheme) ? requestedTheme : DEFAULT_SETTINGS.theme
  };
}
```

- [ ] **Step 3: Verify the shared setting shape is syntactically valid**

Run:

```powershell
node --check shared/constants.js
node --check shared/storage.js
```

Expected:

```text
No output and exit code 0 for both commands.
```

- [ ] **Step 4: Commit the schema change**

Run:

```powershell
git add shared/constants.js shared/storage.js
git commit -m "Add shared theme preference setting"
```

## Task 2: Add the shared theme runtime

**Files:**
- Create: `H:/Extension/universal-product-board/shared/theme.js`
- Modify: `H:/Extension/universal-product-board/popup/popup.html`
- Modify: `H:/Extension/universal-product-board/sidebar/sidebar.html`
- Modify: `H:/Extension/universal-product-board/options/options.html`

- [ ] **Step 1: Create the shared theme helper**

Create `H:/Extension/universal-product-board/shared/theme.js` with this implementation:

```js
// Shared theme handling for Universal Product Board.
(function initSharedTheme(global) {
  const namespace = global.UniversalProductBoard || {};
  const STORAGE_KEYS = namespace.STORAGE_KEYS;
  const DEFAULT_SETTINGS = namespace.DEFAULT_SETTINGS;

  if (!STORAGE_KEYS || !DEFAULT_SETTINGS) {
    throw new Error('UniversalProductBoard constants must load before theme');
  }

  const THEME_VALUES = new Set(['system', 'light', 'dark']);
  const mediaQuery = global.matchMedia
    ? global.matchMedia('(prefers-color-scheme: dark)')
    : null;

  function normalizeTheme(theme) {
    if (typeof theme !== 'string') {
      return DEFAULT_SETTINGS.theme;
    }

    const normalized = theme.toLowerCase();
    return THEME_VALUES.has(normalized) ? normalized : DEFAULT_SETTINGS.theme;
  }

  function resolveAppliedTheme(theme) {
    const normalized = normalizeTheme(theme);
    if (normalized === 'dark') {
      return 'dark';
    }

    if (normalized === 'light') {
      return 'light';
    }

    return mediaQuery?.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolvedTheme = resolveAppliedTheme(theme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    return resolvedTheme;
  }

  async function getStoredTheme() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const storedSettings = result?.[STORAGE_KEYS.SETTINGS] || {};
    return normalizeTheme(storedSettings.theme);
  }

  let removeSystemListener = null;

  function syncSystemListener(theme) {
    if (removeSystemListener) {
      removeSystemListener();
      removeSystemListener = null;
    }

    if (theme !== 'system' || !mediaQuery) {
      return;
    }

    const handleChange = () => {
      applyTheme('system');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      removeSystemListener = () => mediaQuery.removeEventListener('change', handleChange);
      return;
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      removeSystemListener = () => mediaQuery.removeListener(handleChange);
    }
  }

  async function applyStoredTheme() {
    const theme = await getStoredTheme();
    applyTheme(theme);
    syncSystemListener(theme);
    return theme;
  }

  namespace.themeManager = {
    normalizeTheme,
    resolveAppliedTheme,
    applyTheme,
    applyStoredTheme,
    syncSystemListener
  };

  global.UniversalProductBoard = namespace;

  applyTheme(DEFAULT_SETTINGS.theme);
  void applyStoredTheme();
})(typeof globalThis !== 'undefined' ? globalThis : self);
```

- [ ] **Step 2: Load the helper in every extension surface**

Update the HTML files so `shared/theme.js` loads after `shared/constants.js` and before `shared/storage.js` / page code:

```html
<script src="../shared/constants.js"></script>
<script src="../shared/theme.js"></script>
<script src="../shared/storage.js"></script>
```

Apply that change in:

- `H:/Extension/universal-product-board/popup/popup.html`
- `H:/Extension/universal-product-board/sidebar/sidebar.html`
- `H:/Extension/universal-product-board/options/options.html`

- [ ] **Step 3: Verify the new runtime is syntactically valid**

Run:

```powershell
node --check shared/theme.js
```

Expected:

```text
No output and exit code 0.
```

- [ ] **Step 4: Commit the shared runtime**

Run:

```powershell
git add shared/theme.js popup/popup.html sidebar/sidebar.html options/options.html
git commit -m "Add shared extension theme runtime"
```

## Task 3: Add the theme selector to Settings

**Files:**
- Modify: `H:/Extension/universal-product-board/options/options.html`
- Modify: `H:/Extension/universal-product-board/options/options.js`

- [ ] **Step 1: Add the selector markup**

Insert this settings row inside the Preferences panel in `H:/Extension/universal-product-board/options/options.html`, above the notifications toggle:

```html
<label class="field-row" for="theme-select">
  <div>
    <span class="field-title">Theme</span>
    <span class="field-copy">Choose whether the extension follows your system setting or always uses a specific theme.</span>
  </div>
  <select id="theme-select" class="select-input">
    <option value="system">System</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</label>
```

- [ ] **Step 2: Wire the selector in the controller**

Update the `elements` map in `H:/Extension/universal-product-board/options/options.js`:

```js
this.elements = {
  themeSelect: document.getElementById('theme-select'),
  notifications: document.getElementById('show-notifications'),
  donationReminders: document.getElementById('show-donation-reminders'),
  exportButton: document.getElementById('export-button'),
  importFile: document.getElementById('import-file'),
  clearButton: document.getElementById('clear-button'),
  statusMessage: document.getElementById('status-message'),
  statsText: document.getElementById('stats-text')
};
```

Then bind the new event:

```js
this.elements.themeSelect.addEventListener('change', async () => {
  await this.handleThemeChange();
});
```

Load the saved value in `loadSettings()`:

```js
this.elements.themeSelect.value = settings.theme;
```

Add the new handler:

```js
async handleThemeChange() {
  const selectedTheme = this.elements.themeSelect.value;

  try {
    const updatedSettings = await this.storage.updateSettings({
      theme: selectedTheme
    });

    UniversalProductBoard.themeManager.applyTheme(updatedSettings.theme);
    UniversalProductBoard.themeManager.syncSystemListener(updatedSettings.theme);

    this.showStatus(`Theme updated to ${updatedSettings.theme}.`, 'success');
  } catch (error) {
    await this.loadSettings();
    this.showStatus(`Could not update theme: ${error.message}`, 'error');
  }
}
```

- [ ] **Step 3: Verify options logic compiles**

Run:

```powershell
node --check options/options.js
```

Expected:

```text
No output and exit code 0.
```

- [ ] **Step 4: Commit the settings UI change**

Run:

```powershell
git add options/options.html options/options.js
git commit -m "Add theme selector to extension settings"
```

## Task 4: Update popup theming and dark-mode contrast

**Files:**
- Modify: `H:/Extension/universal-product-board/popup/popup.css`

- [ ] **Step 1: Replace media-query-only dark mode with explicit theme variables**

In `H:/Extension/universal-product-board/popup/popup.css`, keep the existing light theme values in `:root` and add explicit dark overrides under:

```css
:root[data-theme="dark"] {
  --primary-color: #f5f5f5;
  --primary-hover: #e4e4e7;
  --secondary-color: #a1a1aa;
  --background-color: #09090b;
  --surface-color: #18181b;
  --text-primary: #fafafa;
  --text-secondary: #d4d4d8;
  --border-color: #3f3f46;
  --shadow: 0 10px 25px -12px rgba(0, 0, 0, 0.65);
}
```

Remove the old `@media (prefers-color-scheme: dark)` block once the explicit theme block is in place.

- [ ] **Step 2: Improve low-emphasis text and surface contrast**

Adjust the popup rules so muted text, footer text, disclosure copy, and donation copy do not blend into dark surfaces. The targeted rules should look like:

```css
.status-text,
#product-count,
.separator,
.preview-info p,
.disclosure-copy,
.donation-reminder-text {
  color: var(--text-secondary);
}

.donation-reminder {
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.16), rgba(39, 39, 42, 0.92));
}

.secondary-button {
  background-color: var(--surface-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.secondary-button:hover {
  background-color: color-mix(in srgb, var(--surface-color) 65%, var(--background-color) 35%);
  border-color: var(--text-secondary);
  color: var(--text-primary);
}
```

If `color-mix()` is not desirable, replace that hover color with a static darker surface token instead.

- [ ] **Step 3: Verify popup CSS change does not break release validation**

Run:

```powershell
node --check popup/popup.js
powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1
```

Expected:

```text
No syntax errors from node --check.
Release validation completes successfully.
```

- [ ] **Step 4: Commit the popup styling update**

Run:

```powershell
git add popup/popup.css
git commit -m "Improve popup theme handling and dark contrast"
```

## Task 5: Update sidebar theming and dark-mode contrast

**Files:**
- Modify: `H:/Extension/universal-product-board/sidebar/sidebar.css`

- [ ] **Step 1: Add explicit dark theme variable overrides**

Replace the current `@media (prefers-color-scheme: dark)` variable block in `H:/Extension/universal-product-board/sidebar/sidebar.css` with:

```css
:root[data-theme="dark"] {
  --primary-color: #a5b4fc;
  --primary-hover: #818cf8;
  --primary-light: rgba(129, 140, 248, 0.18);
  --secondary-color: #cbd5e1;
  --background-color: #020617;
  --surface-color: rgba(15, 23, 42, 0.92);
  --card-background: #111827;
  --text-primary: #f8fafc;
  --text-secondary: #dbe4f0;
  --text-muted: #94a3b8;
  --border-color: rgba(71, 85, 105, 0.75);
  --glass-border: 1px solid rgba(148, 163, 184, 0.08);
  --header-bg: rgba(2, 6, 23, 0.88);
  --title-gradient: linear-gradient(135deg, #f8fafc, #a5b4fc);
  --search-bg: #0f172a;
}
```

Keep the surface-specific dark rules for `.current-page-section` and `.sidebar-donation-reminder`, but tune them to match the new darker surfaces if needed.

- [ ] **Step 2: Strengthen contrast on text-heavy secondary UI**

Adjust the sidebar rules so these surfaces stay legible in dark mode:

- `.current-page-copy`
- `.current-page-note`
- `.sidebar-donation-text`
- `.empty-state p`
- `.loading-state`
- `.icon-button`
- `.view-toggle`
- `.sort-menu-item`
- `.products-toolbar a`

The key outcome is that low-emphasis text uses `--text-secondary` or `--text-muted` only where those tokens remain visibly readable against the dark surfaces.

Concrete updates should include:

```css
.products-header,
.products-toolbar {
  background-color: var(--background-color);
}

.view-toggle {
  background: var(--card-background);
  color: var(--text-secondary);
}

.sort-menu-item:hover,
.sort-menu-item.active,
.context-menu-item:hover {
  background: var(--surface-color);
}

.clear-button:hover {
  background-color: var(--primary-light);
  color: var(--text-primary);
}
```

- [ ] **Step 3: Verify the sidebar code path remains valid**

Run:

```powershell
node --check sidebar/sidebar.js
powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1
```

Expected:

```text
No syntax errors from node --check.
Release validation completes successfully.
```

- [ ] **Step 4: Commit the sidebar styling update**

Run:

```powershell
git add sidebar/sidebar.css
git commit -m "Improve sidebar theme handling and dark contrast"
```

## Task 6: Update options theming and dark-mode contrast

**Files:**
- Modify: `H:/Extension/universal-product-board/options/options.css`

- [ ] **Step 1: Add explicit theme tokens and selector styles**

In `H:/Extension/universal-product-board/options/options.css`, add explicit dark theme overrides:

```css
:root[data-theme="dark"] {
  --primary: #f5f5f5;
  --primary-hover: #e4e4e7;
  --surface-alt: #18181b;
  --border: #3f3f46;
  --text: #fafafa;
  --text-muted: #d4d4d8;
  --success-bg: rgba(34, 197, 94, 0.18);
  --success-text: #bbf7d0;
  --error-bg: rgba(239, 68, 68, 0.18);
  --error-text: #fecaca;
  --warning-bg: rgba(245, 158, 11, 0.18);
  --warning-text: #fde68a;
  --shadow: 0 12px 28px -16px rgba(0, 0, 0, 0.7);
}
```

Also add styles for the new selector row:

```css
.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  margin-bottom: 12px;
}

.field-title {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.field-copy {
  color: var(--text-muted);
}

.select-input {
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text);
  font: inherit;
}
```

- [ ] **Step 2: Improve dark-mode readability on settings surfaces**

Update the existing rules so panels, callouts, helper text, and secondary buttons stay readable on dark backgrounds. Include these kinds of adjustments:

```css
body {
  background-color: var(--surface-alt);
}

.panel {
  background: var(--background-panel, #ffffff);
  color: var(--text);
}

:root[data-theme="dark"] .panel {
  --background-panel: #09090b;
}

.info-callout,
.toggle-row,
.field-row {
  background: var(--surface-alt);
  border-color: var(--border);
}

.secondary-button {
  background: var(--surface-alt);
  color: var(--text);
  border: 1px solid var(--border);
}
```

Keep the styling coherent with the current options page rather than introducing a new visual system.

- [ ] **Step 3: Verify the options page assets are valid**

Run:

```powershell
node --check options/options.js
powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1
```

Expected:

```text
No syntax errors from node --check.
Release validation completes successfully.
```

- [ ] **Step 4: Commit the options styling update**

Run:

```powershell
git add options/options.css
git commit -m "Improve options theme handling and dark contrast"
```

## Task 7: Final verification

**Files:**
- Review: `H:/Extension/universal-product-board/shared/constants.js`
- Review: `H:/Extension/universal-product-board/shared/storage.js`
- Review: `H:/Extension/universal-product-board/shared/theme.js`
- Review: `H:/Extension/universal-product-board/popup/popup.html`
- Review: `H:/Extension/universal-product-board/sidebar/sidebar.html`
- Review: `H:/Extension/universal-product-board/options/options.html`
- Review: `H:/Extension/universal-product-board/options/options.js`
- Review: `H:/Extension/universal-product-board/popup/popup.css`
- Review: `H:/Extension/universal-product-board/sidebar/sidebar.css`
- Review: `H:/Extension/universal-product-board/options/options.css`

- [ ] **Step 1: Run full syntax verification on touched JavaScript**

Run:

```powershell
node --check shared/constants.js
node --check shared/storage.js
node --check shared/theme.js
node --check options/options.js
node --check popup/popup.js
node --check sidebar/sidebar.js
```

Expected:

```text
No output and exit code 0 for each command.
```

- [ ] **Step 2: Run release validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1
```

Expected:

```text
Validation passes with no reported manifest, icon, or JavaScript syntax errors.
```

- [ ] **Step 3: Package the extension**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-chrome-webstore-package.ps1
```

Expected:

```text
Validation passes and a ZIP is created under H:/Extension/universal-product-board/dist/.
```

- [ ] **Step 4: Record manual QA follow-up**

Document that the remaining manual checks are:

- popup in `System`, `Light`, and `Dark`
- side panel in `System`, `Light`, and `Dark`
- options page in `System`, `Light`, and `Dark`
- switching the selector updates the current page immediately
- `System` responds to OS/browser theme changes

- [ ] **Step 5: Commit the final integrated change**

Run:

```powershell
git add shared/constants.js shared/storage.js shared/theme.js popup/popup.html sidebar/sidebar.html options/options.html options/options.js popup/popup.css sidebar/sidebar.css options/options.css
git commit -m "Add extension-wide theme preference"
```
