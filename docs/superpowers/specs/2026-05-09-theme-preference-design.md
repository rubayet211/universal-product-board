# Theme Preference Design

Date: 2026-05-09
Project: Universal Product Board

## Goal

Add a user-selectable theme preference for the full extension UI so users can choose `System`, `Light`, or `Dark` mode. Improve dark-mode text and surface contrast so low-emphasis text does not disappear into dark backgrounds.

## Scope

This change applies to:

- popup UI
- side panel UI
- options/settings UI

This change does not apply to:

- content scripts injected into websites
- background/service worker behavior beyond reading or saving the new setting
- manifest permissions
- extension feature scope outside theme selection and contrast fixes

## User Experience

The options page will expose a new `Theme` setting with three choices:

- `System`
- `Light`
- `Dark`

Behavior:

- `System` follows the user’s current OS/browser color-scheme preference.
- `Light` forces the extension UI into light mode.
- `Dark` forces the extension UI into dark mode.

The saved preference applies consistently across popup, side panel, and options pages.

Existing users default to `System`, preserving current behavior unless they explicitly choose another option.

## Technical Design

### Shared Setting

Add a new settings field in the shared defaults:

- `theme: 'system'`

The setting lives in the existing shared settings storage path, alongside notification and donation reminder preferences.

### Shared Theme Runtime

Add a small shared theme helper loaded by each extension page before the page-specific script. Its responsibilities:

1. Read the saved theme preference from storage.
2. Resolve `system` using `window.matchMedia('(prefers-color-scheme: dark)')`.
3. Apply `data-theme="light"` or `data-theme="dark"` to `document.documentElement`.
4. Listen for system color-scheme changes only when the saved preference is `system`.
5. Expose a lightweight way to reapply the theme after the user changes it in settings.

The helper should be intentionally narrow. It should not own unrelated settings or UI behavior.

### Options Integration

The options page will:

- render a theme selector control
- load the current saved setting
- save changes through the existing settings manager
- immediately apply the new theme after save

The selector should sit with other public release preferences and use the same tone as the rest of the settings UI.

### Styling Strategy

Replace reliance on dark-mode media queries alone with explicit theme-driven CSS variables.

Each extension UI surface will define:

- light theme variables at the base level
- dark theme variable overrides under `[data-theme="dark"]`

The final color system should improve contrast for:

- body text
- muted/helper text
- disclosure and informational copy
- empty-state copy
- card backgrounds
- borders
- secondary buttons
- subtle status or support text

The goal is readability, not a redesign. Layout, spacing, and interaction patterns should remain intact.

## Compatibility and Migration

No data migration is required beyond the new default setting key. Existing stored settings continue to work because missing `theme` values will fall back to `system`.

## Risks

### Flash of incorrect theme

If the theme helper runs too late, the popup or side panel may briefly render in the wrong theme.

Mitigation:

- load the shared theme script before page-specific scripts
- apply the theme as early as practical during page startup

### Inconsistent dark colors across surfaces

Each page currently has separate CSS. A partial update could leave one surface with weaker contrast.

Mitigation:

- touch popup, sidebar, and options CSS together
- use the same theme variable naming pattern in all three

## Verification Plan

Verification for this task will include:

- confirm missing stored `theme` falls back safely to `system`
- confirm settings persistence for `system`, `light`, and `dark`
- run JavaScript syntax checks on all touched scripts
- rerun the existing release validation script
- inspect the CSS changes for explicit dark-theme text and surface contrast coverage

Manual follow-up still required:

- load the unpacked extension in Chrome
- verify popup, side panel, and options each render correctly in all three theme modes
- verify `System` updates when the OS/browser theme changes while the extension UI is open

## Non-Goals

- redesigning the extension’s visual identity
- adding per-surface theme overrides
- theming merchant websites
- adding animation or transition work beyond what is already present
