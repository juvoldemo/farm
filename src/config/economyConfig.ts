export type EconomyTier = 'short' | 'medium' | 'long' | 'very-long'

export interface CropBalanceConfig {
  growthTimeSeconds:number; unlockLevel:number; seedPrice:number; sellPricePerUnit:number
  baseYieldMin:number; baseYieldMax:number; bonusYieldMin:number; bonusYieldMax:number
  bonusYieldChance:number; targetProfitPerHour:number; economyTier:EconomyTier
}

// The only source of truth for crop progression. Values are intentionally real-time hours.
export const cropBalance:Record<string,CropBalanceConfig>={
 cabbage:{growthTimeSeconds:11700,unlockLevel:1,seedPrice:150,sellPricePerUnit:110,baseYieldMin:3,baseYieldMax:5,bonusYieldMin:1,bonusYieldMax:2,bonusYieldChance:.35,targetProfitPerHour:110,economyTier:'short'},
 carrot:{growthTimeSeconds:13500,unlockLevel:2,seedPrice:190,sellPricePerUnit:140,baseYieldMin:3,baseYieldMax:5,bonusYieldMin:1,bonusYieldMax:2,bonusYieldChance:.35,targetProfitPerHour:118,economyTier:'short'},
 corn:{growthTimeSeconds:15300,unlockLevel:3,seedPrice:240,sellPricePerUnit:140,baseYieldMin:4,baseYieldMax:6,bonusYieldMin:1,bonusYieldMax:2,bonusYieldChance:.32,targetProfitPerHour:127,economyTier:'short'},
 tomato:{growthTimeSeconds:17100,unlockLevel:5,seedPrice:290,sellPricePerUnit:170,baseYieldMin:4,baseYieldMax:6,bonusYieldMin:1,bonusYieldMax:2,bonusYieldChance:.32,targetProfitPerHour:137,economyTier:'short'},
 potato:{growthTimeSeconds:19800,unlockLevel:7,seedPrice:380,sellPricePerUnit:180,baseYieldMin:5,baseYieldMax:7,bonusYieldMin:1,bonusYieldMax:3,bonusYieldChance:.30,targetProfitPerHour:148,economyTier:'short'},
 strawberry:{growthTimeSeconds:23400,unlockLevel:9,seedPrice:520,sellPricePerUnit:220,baseYieldMin:5,baseYieldMax:8,bonusYieldMin:1,bonusYieldMax:3,bonusYieldChance:.30,targetProfitPerHour:159,economyTier:'medium'},
 watermelon:{growthTimeSeconds:27000,unlockLevel:11,seedPrice:670,sellPricePerUnit:240,baseYieldMin:6,baseYieldMax:9,bonusYieldMin:1,bonusYieldMax:4,bonusYieldChance:.27,targetProfitPerHour:171,economyTier:'medium'},
 pumpkin:{growthTimeSeconds:32400,unlockLevel:13,seedPrice:890,sellPricePerUnit:310,baseYieldMin:6,baseYieldMax:9,bonusYieldMin:1,bonusYieldMax:4,bonusYieldChance:.27,targetProfitPerHour:184,economyTier:'medium'},
 grape:{growthTimeSeconds:37800,unlockLevel:15,seedPrice:1150,sellPricePerUnit:330,baseYieldMin:7,baseYieldMax:11,bonusYieldMin:1,bonusYieldMax:5,bonusYieldChance:.24,targetProfitPerHour:198,economyTier:'medium'},
 pepper:{growthTimeSeconds:43200,unlockLevel:17,seedPrice:1500,sellPricePerUnit:420,baseYieldMin:7,baseYieldMax:11,bonusYieldMin:1,bonusYieldMax:5,bonusYieldChance:.22,targetProfitPerHour:213,economyTier:'long'},
 pineapple:{growthTimeSeconds:59400,unlockLevel:20,seedPrice:2400,sellPricePerUnit:580,baseYieldMin:8,baseYieldMax:12,bonusYieldMin:1,bonusYieldMax:6,bonusYieldChance:.20,targetProfitPerHour:229,economyTier:'long'},
 dragonfruit:{growthTimeSeconds:86400,unlockLevel:24,seedPrice:4300,sellPricePerUnit:830,baseYieldMin:9,baseYieldMax:14,bonusYieldMin:1,bonusYieldMax:8,bonusYieldChance:.18,targetProfitPerHour:246,economyTier:'very-long'},
}

export const STARTING_COINS=2000
export const INITIAL_UNLOCKED_PLOTS=3

export const plotBalance=[
 [1,0,1],[2,0,1],[3,0,1],[4,2500,2],[5,4000,3],[6,5500,4],[7,11500,5],[8,13500,6],
 [9,26000,7],[10,29000,8],[11,41500,9],[12,46000,10],[13,77500,11],[14,84000,12],[15,115000,13],[16,123500,14],
 [17,197500,15],[18,210000,16],[19,320000,17],[20,400000,18],[21,610000,20],[22,680000,22],[23,1050000,24],[24,1200000,26],
] as const

export const roundToNiceNumber=(value:number)=>{const step=value<100?5:value<1000?10:value<10000?50:value<100000?500:1000;return Math.max(1,Math.round(value/step)*step)}
