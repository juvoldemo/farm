import type { CropVisualStage } from '../types/farm'

export interface CropStageVisual {
  glyph: string
  scale: number
  shadowScale: number
  glowColor: string
  fruitGlyph?: string
  fruitCount?: 2 | 3 | 4
}

export type CropVisualDefinition = Readonly<Record<CropVisualStage, CropStageVisual>>

const createCropVisual = (
  fruitGlyph: string,
  glowColor: string,
  matureGlyph = '🌿',
  fruitCount: 2 | 3 | 4 = 3,
): CropVisualDefinition => ({
  seed: { glyph:'🫘', scale:.58, shadowScale:.48, glowColor },
  sprout: { glyph:'🌱', scale:.72, shadowScale:.58, glowColor },
  young: { glyph:'🌿', scale:.84, shadowScale:.68, glowColor },
  growing: { glyph:'🪴', scale:.96, shadowScale:.8, glowColor },
  mature: { glyph:matureGlyph, scale:1.06, shadowScale:.9, glowColor },
  harvestable: {
    glyph:matureGlyph,
    fruitGlyph,
    fruitCount,
    scale:1.14,
    shadowScale:1,
    glowColor,
  },
})

/**
 * Central visual placeholders for every crop currently declared in config/crops.ts.
 * All values are local emoji/CSS-friendly data and can later be replaced by assets.
 */
export const cropVisualConfig = {
  cabbage:createCropVisual('🥬','#c8f77a','🪴',2),
  carrot:createCropVisual('🥕','#ffb45f'),
  corn:createCropVisual('🌽','#ffe266','🌾',4),
  tomato:createCropVisual('🍅','#ff776d',undefined,4),
  potato:createCropVisual('🥔','#d8ae72'),
  strawberry:createCropVisual('🍓','#ff6680',undefined,4),
  watermelon:createCropVisual('🍉','#7de077','🌿',3),
  pumpkin:createCropVisual('🎃','#ffac4f','🌿',3),
  grape:createCropVisual('🍇','#b88cff','🌿',4),
  pepper:createCropVisual('🫑','#79d987',undefined,4),
  pineapple:createCropVisual('🍍','#ffd35c','🌿',3),
  dragonfruit:createCropVisual('🌺','#ff7cba','🌵',3),
} as const satisfies Readonly<Record<string, CropVisualDefinition>>

export type CropVisualCropId = keyof typeof cropVisualConfig

const fallbackCropVisual = createCropVisual('🌾','#d6ef8c')

export const getCropVisualConfig = (cropId: string): CropVisualDefinition =>
  cropVisualConfig[cropId as CropVisualCropId] ?? fallbackCropVisual

/** Presentation-only mapping; it never reads or mutates crop timestamps. */
export const getCropVisualStage = (
  growthPercent: number,
  isReadyToHarvest: boolean,
): CropVisualStage => {
  const percent = Number.isFinite(growthPercent)
    ? Math.max(0,Math.min(100,growthPercent))
    : 0

  if(isReadyToHarvest || percent >= 100)return 'harvestable'
  if(percent < 15)return 'seed'
  if(percent < 35)return 'sprout'
  if(percent < 60)return 'young'
  if(percent < 90)return 'growing'
  return 'mature'
}
