export type Currency = 'gold' | 'diamonds'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'
export type ItemType = 'seed' | 'produce' | 'fertilizer'

export interface GrowthStageConfig {
  key: 'seed' | 'sprout' | 'young' | 'mature' | 'fruit'
  label: string
  startPercent: number
  endPercent: number
  icon: string
}

export interface CropDefinition {
  id: string; name: string; icon: string; description: string; seedPrice: number; sellPrice: number
  growthDurationSeconds: number; requiredLevel: number; harvestQuantityMin: number; harvestQuantityMax: number
  xpReward: number; rarity: Rarity; repeatableHarvest: boolean; regrowDurationSeconds?: number
  growthStages: GrowthStageConfig[]
}

export interface FertilizerDefinition {
  id: string; name: string; icon: string; description: string
  priceGold?: number; priceDiamonds?: number
  reductionType: 'seconds' | 'percentage' | 'instant'; reductionValue: number; maxUsesPerCrop: number
}

export interface FertilizerUsage { fertilizerId: string; usedAt: string; reductionSeconds: number }
export interface CropInstance {
  id: string; cropId: string; plotId: string; plantedAt: string; readyAt: string
  baseGrowthDuration: number; totalReductionSeconds: number; fertilizerUsage: FertilizerUsage[]; lastCalculatedAt: string
}
export interface FarmPlot { id: string; plotNumber: number; isUnlocked: boolean; unlockPrice: number; requiredLevel: number; cropInstance?: CropInstance }
export interface InventoryItem { id: string; itemType: ItemType; referenceId: string; quantity: number }
export interface PlayerSettings { music: boolean; sound: boolean; reducedMotion: boolean }
export interface Player {
  id: string; name: string; level: number; currentXp: number; gold: number; diamonds: number
  energy: number; inventoryCapacity: number; createdAt: string; lastLoginAt: string; settings: PlayerSettings
}
export interface Stats { planted: number; harvested: number; sold: number; fertilizersUsed: number; plotsUnlocked: number }
export interface GameStateData { version: number; player: Player; plots: FarmPlot[]; inventory: InventoryItem[]; stats: Stats; lastSavedAt: string; tutorialStep: number }
export interface GrowthState { growthPercent: number; currentStage: GrowthStageConfig; remainingSeconds: number; isReadyToHarvest: boolean; readyAt: string }
