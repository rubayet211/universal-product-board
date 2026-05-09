# Universal Product Board Extension Icons

## Icon Files Required

The release package uses only the following PNG icon files:

- `icon16.png` - 16x16 pixels (extension icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Creating Icons

### Option 1: Convert SVG to PNG

1. Open `icon.svg` in a vector graphics editor (Inkscape, Adobe Illustrator, etc.)
2. Export to PNG at the required sizes:
   - 16x16 for icon16.png
   - 48x48 for icon48.png
   - 128x128 for icon128.png

### Option 2: Online Converters

Use online SVG to PNG converters:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/
- https://www.online-convert.com/

### Option 3: Use ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Convert SVG to PNG at different sizes
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## Icon Design Guidelines

The current design features:
- Modern shopping bag icon
- Purple/blue color scheme (#6366f1)
- White elements on colored background
- Star bookmark indicating saved items
- Clean, professional appearance

## Alternative Icon Designs

Consider these variations for the final version:
1. **Minimalist**: Simple bookmark or star icon
2. **Product-focused**: Stack of product cards
3. **Board-themed**: Pin board with products pinned to it
4. **Save-themed**: Floppy disk or download icon (though outdated)

## Color Palette

- Primary: #6366f1 (Indigo)
- Secondary: #4f46e5 (Darker Indigo)
- Accent: White (#ffffff)
- Background: #e2e8f0 (Light Gray)

## File Structure

```
assets/icons/
├── icon16.png        # 16x16 extension icon
├── icon48.png        # 48x48 management icon
├── icon128.png       # 128x128 store icon
├── icon.svg          # Source SVG file
└── README.md         # This file
```

Only the three PNG files are included in the Chrome Web Store package.
