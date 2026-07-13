import type { CropDefinition, GrowthStageConfig } from '../types/game'

export const GROWTH_TIME_MULTIPLIER = 20
const growthDuration = (baseSeconds: number) => baseSeconds * GROWTH_TIME_MULTIPLIER

const stages = (icons: [string,string,string,string,string]): GrowthStageConfig[] => [
  { key:'seed', label:'Ươm mầm', startPercent:0, endPercent:15, icon:icons[0], scale:.65, animation:'seed-drop' },
  { key:'sprout', label:'Lên chồi', startPercent:15, endPercent:35, icon:icons[1], scale:.76, animation:'stage-pop' },
  { key:'young', label:'Cây non', startPercent:35, endPercent:60, icon:icons[2], scale:.88, animation:'stage-pop' },
  { key:'mature', label:'Trưởng thành', startPercent:60, endPercent:90, icon:icons[3], scale:1, animation:'stage-glow' },
  { key:'fruit', label:'Ra trái', startPercent:90, endPercent:101, icon:icons[4], scale:1.14, animation:'stage-glow' },
]
const commonStages = (fruit: string) => stages(['🫘','🌱','🌿','🪴',fruit])
const balance=(base:number,min:number,max:number,bonusYieldChance=.25,maxBonusYield=2)=>({baseHarvestQuantity:base,minHarvestQuantity:min,maxHarvestQuantity:max,bonusYieldChance,maxBonusYield,perfectHarvestChance:.04,perfectHarvestMultiplier:1.5,careYieldBonusPercent:18})

export const crops: CropDefinition[] = [
  {id:'cabbage',name:'Cải xanh',icon:'🥬',description:'Rau xanh giòn ngọt, lớn rất nhanh.',seedPrice:10,sellPrice:6,growthDurationSeconds:growthDuration(60),requiredLevel:1,harvestQuantityMin:3,harvestQuantityMax:7,baseHarvestQuantity:4,minHarvestQuantity:3,maxHarvestQuantity:7,bonusYieldChance:.35,maxBonusYield:3,perfectHarvestChance:.05,perfectHarvestMultiplier:1.5,careYieldBonusPercent:20,xpReward:4,rarity:'common',repeatableHarvest:false,growthStages:commonStages('🥬')},
  {id:'carrot',name:'Cà rốt',icon:'🥕',description:'Củ cam ngọt lành cho nông trại mới.',seedPrice:25,sellPrice:9,growthDurationSeconds:growthDuration(180),requiredLevel:2,harvestQuantityMin:3,harvestQuantityMax:7,baseHarvestQuantity:4,minHarvestQuantity:3,maxHarvestQuantity:7,bonusYieldChance:.3,maxBonusYield:2,perfectHarvestChance:.045,perfectHarvestMultiplier:1.5,careYieldBonusPercent:18,xpReward:8,rarity:'common',repeatableHarvest:false,growthStages:commonStages('🥕')},
  {id:'corn',name:'Ngô',icon:'🌽',description:'Bắp vàng óng dưới nắng.',seedPrice:60,sellPrice:18,growthDurationSeconds:growthDuration(600),requiredLevel:3,harvestQuantityMin:4,harvestQuantityMax:8,...balance(5,4,8),xpReward:18,rarity:'common',repeatableHarvest:false,growthStages:commonStages('🌽')},
  {id:'tomato',name:'Cà chua',icon:'🍅',description:'Chùm quả đỏ mọng.',seedPrice:120,sellPrice:30,growthDurationSeconds:growthDuration(1800),requiredLevel:5,harvestQuantityMin:5,harvestQuantityMax:9,...balance(6,5,9,.3,3),xpReward:30,rarity:'common',repeatableHarvest:false,growthStages:commonStages('🍅')},
  {id:'potato',name:'Khoai tây',icon:'🥔',description:'Củ bùi ngon, năng suất ổn định.',seedPrice:180,sellPrice:42,growthDurationSeconds:growthDuration(2700),requiredLevel:6,harvestQuantityMin:5,harvestQuantityMax:9,...balance(7,5,9),xpReward:40,rarity:'common',repeatableHarvest:false,growthStages:commonStages('🥔')},
  {id:'strawberry',name:'Dâu tây',icon:'🍓',description:'Quả đỏ ngọt thơm.',seedPrice:250,sellPrice:48,growthDurationSeconds:growthDuration(3600),requiredLevel:7,harvestQuantityMin:7,harvestQuantityMax:11,...balance(8,7,11,.28,3),xpReward:50,rarity:'uncommon',repeatableHarvest:false,growthStages:commonStages('🍓')},
  {id:'watermelon',name:'Dưa hấu',icon:'🍉',description:'Trái lớn mát lành mùa hè.',seedPrice:650,sellPrice:180,growthDurationSeconds:growthDuration(10800),requiredLevel:10,harvestQuantityMin:4,harvestQuantityMax:7,...balance(5,4,7,.22,2),xpReward:100,rarity:'uncommon',repeatableHarvest:false,growthStages:commonStages('🍉')},
  {id:'pumpkin',name:'Bí đỏ',icon:'🎃',description:'Bí tròn vàng cam đầy sức sống.',seedPrice:900,sellPrice:250,growthDurationSeconds:growthDuration(18000),requiredLevel:11,harvestQuantityMin:4,harvestQuantityMax:8,...balance(6,4,8,.22,2),xpReward:140,rarity:'uncommon',repeatableHarvest:false,growthStages:commonStages('🎃')},
  {id:'grape',name:'Nho',icon:'🍇',description:'Những chùm nho tím quý giá.',seedPrice:1500,sellPrice:360,growthDurationSeconds:growthDuration(28800),requiredLevel:13,harvestQuantityMin:6,harvestQuantityMax:10,...balance(8,6,10,.2,3),xpReward:220,rarity:'rare',repeatableHarvest:false,growthStages:commonStages('🍇')},
  {id:'pepper',name:'Ớt chuông',icon:'🫑',description:'Ớt giòn rực rỡ sắc màu.',seedPrice:2200,sellPrice:520,growthDurationSeconds:growthDuration(43200),requiredLevel:15,harvestQuantityMin:6,harvestQuantityMax:11,...balance(8,6,11,.2,3),xpReward:310,rarity:'rare',repeatableHarvest:false,growthStages:commonStages('🫑')},
  {id:'pineapple',name:'Dứa',icon:'🍍',description:'Trái nhiệt đới thơm ngọt.',seedPrice:3800,sellPrice:1200,growthDurationSeconds:growthDuration(64800),requiredLevel:18,harvestQuantityMin:3,harvestQuantityMax:7,...balance(5,3,7,.18,2),xpReward:480,rarity:'rare',repeatableHarvest:false,growthStages:commonStages('🍍')},
  {id:'dragonfruit',name:'Thanh long',icon:'🐉',description:'Nông sản cao cấp của vùng nắng ấm.',seedPrice:7000,sellPrice:2300,growthDurationSeconds:growthDuration(86400),requiredLevel:20,harvestQuantityMin:3,harvestQuantityMax:7,...balance(5,3,7,.16,2),xpReward:750,rarity:'epic',repeatableHarvest:false,growthStages:commonStages('🌺')},
]
export const cropById = (id: string) => crops.find(c => c.id === id)
