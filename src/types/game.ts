export type Currency = 'gold'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ItemType = 'seed' | 'produce' | 'fertilizer' | 'gift' | 'food' | 'tool'
export type SeedRarity = Rarity
export type TraitId = 'fast_growth'|'high_yield'|'high_quality'|'drought_resistant'|'rain_loving'|'giant_fruit'|'good_seed'|'easy_hybrid'
export interface CropTrait { traitId:TraitId; level:1|2|3; value:number; discovered:boolean }
export interface SeedInstance {
  id:string; cropId:string; rarity:SeedRarity; traits:CropTrait[]; source:'shop'|'harvest'|'hybrid'|'event'|'reward'
  parentSeedIds:string[]; generation:number; hybridId?:string; status:'inventory'|'planted'|'pending'; createdAt:string; updatedAt:string
}
export interface HybridDiscovery { recipeId:string; discoveredAt:string; totalCreated:number; highestGeneration:number }
export interface HarvestGeneticsResult { traitMessages:string[]; quality:'normal'|'silver'|'gold'; giantQuantity:number; returnedSeed?:SeedInstance; hybridSeed?:SeedInstance; hybridAttempted:boolean }
import type { ActiveFoodBuff, DialogueProgress, NpcFarmState, NpcRelationship, NpcRuntimeState, NpcShopState } from './npc'

export interface GrowthStageConfig {
  key: 'seed' | 'sprout' | 'young' | 'mature' | 'fruit'
  label: string
  startPercent: number
  endPercent: number
  icon: string
  scale?: number
  animation?: string
}

export interface CropDefinition {
  id: string; name: string; icon: string; description: string; seedPrice: number; sellPrice: number
  growthDurationSeconds: number; requiredLevel: number; harvestQuantityMin: number; harvestQuantityMax: number
  baseHarvestQuantity: number; minHarvestQuantity: number; maxHarvestQuantity: number
  bonusYieldChance: number; maxBonusYield: number; perfectHarvestChance?: number; perfectHarvestMultiplier?: number; careYieldBonusPercent?: number
  xpReward: number; rarity: Rarity; repeatableHarvest: boolean; regrowDurationSeconds?: number
  growthStages: GrowthStageConfig[]
}

export interface FertilizerDefinition {
  id: string; name: string; icon: string; description: string
  priceGold: number
  reductionType: 'seconds' | 'percentage' | 'instant'; reductionValue: number; maxUsesPerCrop: number
}

export interface FertilizerUsage { fertilizerId: string; usedAt: string; reductionSeconds: number }
export interface CropCareState { water: number; weeds: boolean; pests: boolean; wateredAt?: string; weededAt?: string; pestsClearedAt?: string }
export interface CropInstance {
  id: string; cropId: string; plotId: string; plantedAt: string; readyAt: string
  baseGrowthDuration: number; totalReductionSeconds: number; fertilizerUsage: FertilizerUsage[]; lastCalculatedAt: string
  care?: CropCareState
  plantedSeedInstanceId?:string; rarity?:SeedRarity; traits?:CropTrait[]; calculatedGrowthDuration?:number
  weatherEffects?:{rainExperienced:boolean}; source?:SeedInstance['source']; parentSeedIds?:string[]; generation?:number; hybridId?:string
}
export interface FarmPlot { id: string; plotNumber: number; isUnlocked: boolean; unlockPrice: number; requiredLevel: number; cropInstance?: CropInstance }
export interface InventoryItem { id: string; itemType: ItemType; referenceId: string; quantity: number }
export interface PlayerSettings { music: boolean; sound: boolean; reducedMotion: boolean; haptics: boolean; volume: number }
export interface Player {
  id: string; name: string; level: number; currentXp: number; gold: number
  energy: number; inventoryCapacity: number; createdAt: string; lastLoginAt: string; settings: PlayerSettings
}
export interface Stats { planted: number; harvested: number; sold: number; fertilizersUsed: number; plotsUnlocked: number }
export type WeatherId = 'sunny'|'cloudy'|'rain'|'windy'|'rainbow'
export interface WeatherState { id: WeatherId; startedAt: string; endsAt: string; seed: number }
export interface HarvestHistory { id:string; cropId:string; plotId:string; harvestedAt:string; baseQuantity:number; bonusQuantity:number; finalQuantity:number; isLuckyHarvest:boolean; isPerfectHarvest:boolean; xpReceived:number }
export interface FarmOrderItem { produceId:string; quantity:number }
export interface FarmOrder { id:string; customerName:string; customerAvatar?:string; items:FarmOrderItem[]; rewardGold:number; rewardXp:number; createdAt:string; expiresAt?:string; rarity:'normal'|'rare'|'special'; status:'active'|'completed'|'claimed'|'expired' }
export interface RandomEventState { activeEventId?:string; spawnedAt?:string; expiresAt?:string; lastEventAt?:string; claimedToday:number; dayKey:string }
export interface GameStateData { version: number; player: Player; plots: FarmPlot[]; inventory: InventoryItem[]; specialSeeds:SeedInstance[]; hybridDiscoveries:HybridDiscovery[]; stats: Stats; lastSavedAt: string; tutorialStep: number; orders: FarmOrder[]; currentWeather: WeatherState; randomEventState: RandomEventState; harvestHistory: HarvestHistory[]; npcStates:Record<string,NpcRuntimeState>;npcRelationships:Record<string,NpcRelationship>;npcShopStates:Record<string,NpcShopState>;npcFarmStates:Record<string,NpcFarmState>;dialogueProgress:Record<string,DialogueProgress>;activeFoodBuffs:ActiveFoodBuff[];lastNpcSyncAt:string }
export interface GrowthState { growthPercent: number; currentStage: GrowthStageConfig; remainingSeconds: number; isReadyToHarvest: boolean; readyAt: string }
