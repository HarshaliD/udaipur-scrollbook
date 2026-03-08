

## Plan: Update Udaipur Scrollbook with 3 New Locations

All 6 assets are now accounted for. The window overlay is a PNG — that works fine as an `<img>` tag.

### Asset Summary

| Location | Base | Overlay |
|---|---|---|
| City Palace | existing | existing |
| Jagdish Temple | existing | lotus.svg (existing) |
| Shopping | `shopping-2.svg` | `paisa.svg` |
| Saheliyon Ki Bari | `saheliyon_ki_baari-2.svg` | `girl-2.svg` |
| Monsoon Palace | `ChatGPT_Image_Mar_9_2026_02_50_28_AM-2.svg` | `window.png` |

### Changes

**1. Copy assets to `src/assets/`**
- `shopping-2.svg` → `src/assets/shopping.svg`
- `paisa.svg` → `src/assets/paisa.svg`
- `saheliyon_ki_baari-2.svg` → `src/assets/saheliyon-ki-bari.svg`
- `girl-2.svg` → `src/assets/girl.svg`
- `ChatGPT_Image_Mar_9_2026_02_50_28_AM-2.svg` → `src/assets/monsoon-palace.svg` (replace existing)
- `window.png` → `src/assets/window.png`

**2. Update `src/pages/Index.tsx`**
- Remove `fateh-sagar` and `old-city-walk` from LOCATIONS array and their imports.
- Remove `boatImg` import and all boat animation logic.
- Add imports for new assets: `shoppingImg`, `paisaImg`, `saheliyonImg`, `girlImg`, `windowImg`.
- Update LOCATIONS to 5 entries: City Palace, Jagdish Temple, Shopping, Saheliyon Ki Bari, Monsoon Palace.
- Replace the new `monsoon-palace` import with the uploaded ChatGPT SVG.
- In the card rendering, add overlay logic for each new location (same pattern as lotus for Jagdish Temple):
  - **Shopping**: When visited, show `paisa.svg` centered, ~60% width, with fade-in animation.
  - **Saheliyon Ki Bari**: When visited, show `girl.svg` centered, ~50% width, with fade-in animation.
  - **Monsoon Palace**: When visited, show `window.png` centered/aligned, ~40% width, with fade-in animation.
- Remove `boatSailingId` state and its timer logic from `markVisited`.
- Ensure all 5 cards are fully colorful (no grayscale filter) — consistent with City Palace and Jagdish Temple.

**3. Update `src/index.css`**
- Add CSS classes for the three new overlay animations (`paisa-animation`, `girl-animation`, `window-animation`) following the same pattern as `lotus-animation` — absolute positioned, centered, with a smooth scale/fade-in animation.

**4. Cleanup**
- Remove unused SVG files from `src/assets/` if desired: `fateh-sagar.svg`, `old-city-walk.svg`, `boat.svg`.

