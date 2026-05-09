# Universal Product Board Support

Use this document as the repository support artifact for the Chrome Web Store listing and future hosted support pages.

## Contact

- Support email: replace this placeholder with your real support inbox before publishing the store listing
- Suggested format: `support@yourdomain.com`

## What This Extension Does

Universal Product Board helps users save and organize products from shopping pages into one local browser board. Saved product records stay in the current browser profile unless the user exports them manually.

## Common Questions

### Why doesn't the extension work on `chrome://` pages or the Chrome Web Store?
Chrome blocks extensions from scripting protected pages. Open a regular `http` or `https` shopping page instead.

### Why is Live Save asking for website access?
Live Save is optional. If enabled, the side panel uses optional website access so the visible current-page card can follow the active shopping tab while you browse.

### Why are save notifications not showing?
Notifications are optional and stay off until the user enables them in Settings and grants the Chrome permission prompt.

### Why do some product images still load from store websites?
The extension can display product preview images directly from merchant or CDN hosts so the saved item remains visually recognizable.

### Why did an import skip some entries?
Imports keep only valid product rows with usable `http` or `https` product URLs. Invalid or unsupported entries are ignored.

## Data And Privacy

- Product records are stored in `chrome.storage.local`
- No analytics or remote sync are included
- See `PRIVACY_POLICY.md` and `privacy-policy.html` for the full privacy policy text

## Manual QA Reminder

Interactive Chrome QA still needs to be completed outside this workspace before final Web Store submission. Use `RELEASE_CHECKLIST.md` and `TESTING_REPORT.md` for the current test scope.
