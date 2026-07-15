# Crop visual assets

The first 2.5D version uses local emoji and CSS placeholders from
`src/config/cropVisualConfig.ts`. It does not hotlink third-party images.

To replace them with polished PNG/WebP renders later:

1. Add transparent files under one folder per crop, for example
   `carrot/seed.webp`, `carrot/sprout.webp`, …, `carrot/harvestable.webp`.
2. Keep each source square, tightly cropped, and preferably at 256×256 or
   512×512. Export WebP with transparency and keep the mobile payload small.
3. Add an optional local `src` field to `CropStageVisual`, import the files in
   `cropVisualConfig.ts`, and let `CropVisual.tsx` render an `<img>` when `src`
   exists. Keep the current glyph as the fallback for old or missing assets.
4. Do not change crop IDs, plot IDs, stage timing, `plantedAt`, or `readyAt`.
   The six visual stages are presentation-only mappings over existing growth
   percentages and the harvest-ready state.
5. Verify low/medium/high quality, reduced motion, 320px mobile, and desktop
   after replacing assets.
