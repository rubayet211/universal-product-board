# Release Checklist

## Pre-release

1. Confirm `manifest.json` version is the intended release version.
2. Run `powershell -ExecutionPolicy Bypass -File scripts/validate-release.ps1`.
3. Run `powershell -ExecutionPolicy Bypass -File scripts/package-extension.ps1`.
4. Confirm `dist/universal-product-board-1.3.0.zip` exists and contains only runtime files.

## Manual Chrome QA

1. Load the unpacked extension in Chrome 116 or later.
2. Confirm install does not show an all-sites host permission warning.
3. Open the popup on a supported shopping page and verify the preview loads.
4. Save a product and confirm it appears in the side panel.
5. Save the same URL again and confirm it updates instead of duplicating.
6. Open the side panel and confirm the Current Page card asks to enable Live Save before optional site access is granted.
7. Enable Live Save from the side panel and confirm Chrome prompts for optional website access.
8. Switch between supported product tabs and confirm the Current Page card updates without reopening the popup.
9. Navigate the active tab to another supported product page and confirm the Current Page card rescans after navigation finishes.
10. Save from the Current Page card and confirm it matches popup create-vs-update behavior.
11. Open a restricted page such as `chrome://extensions` and confirm the side panel shows the unavailable state while the saved board still works.
12. Enable notifications in Settings and confirm Chrome prompts for the optional permission.
13. Save another product and confirm the save notification appears only after permission is granted.
14. Disable notifications and confirm no further save notifications appear.
15. Verify the popup and side panel show the donate link, and the weekly donation reminder can be dismissed for 7 days.
16. Disable weekly donation reminders in Settings and confirm the reminder stops appearing while the donate link remains visible.
17. Verify export, import, search, sort, delete, and clear flows still work.

## Submission

1. Publish the contents of `PRIVACY_POLICY.md` at a public HTTPS URL.
2. Review the generated assets under `assets/store/` and choose the final popup, side panel, settings, and promo images.
3. Copy the final listing text from `CHROME_WEB_STORE_LISTING.md`.
4. Paste the public privacy policy URL into the Chrome Web Store dashboard.
5. Add the real support email or support URL to the dashboard using `SUPPORT.md` as the source artifact.
6. Upload the packaged zip and complete the privacy answers based on the local-only storage model.
