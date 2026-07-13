import type { WeatherId } from './game'

export type NpcActivityType='sleeping'|'waking_up'|'eating'|'walking'|'working'|'farming'|'watering'|'harvesting'|'cooking'|'serving_customers'|'stocking_shelves'|'shopping'|'resting'|'socializing'|'cleaning'|'reading'|'repairing_tools'|'staying_indoors'
export type LocationType='player_farm'|'npc_home'|'shop'|'npc_farm'|'restaurant'|'village_square'|'road'
export interface GameTimeState { currentDateTime:string;hour:number;minute:number;dayOfWeek:number;season?:string;weatherId:WeatherId;timeMode:'real_time'|'accelerated' }
export interface NpcScheduleCondition { type:'weather'|'day_of_week'|'season'|'friendship_level'|'quest_state'|'festival';operator:'equals'|'not_equals'|'greater_than'|'includes';value:string|number|string[] }
export interface NpcScheduleEntry { id:string;startTime:string;endTime:string;locationId:string;activity:NpcActivityType;animation?:string;dialogueGroupId?:string;shopState?:'open'|'closed'|'limited';conditions?:NpcScheduleCondition[];fromLocationId?:string;toLocationId?:string }
export interface NpcMovementState { fromLocationId:string;toLocationId:string;startedAt:string;arrivesAt:string;progress:number }
export interface NpcNeedsState { energy:number;hunger:number;social:number;workProgress:number;lastUpdatedAt:string }
export interface NpcRuntimeState { npcId:string;currentLocationId:string;currentActivity:NpcActivityType;scheduleEntryId:string;movementState?:NpcMovementState;needsState:NpcNeedsState;lastUpdatedAt:string }
export interface NpcRelationship { npcId:string;friendshipPoints:number;friendshipLevel:number;lastTalkedDate?:string;giftsGivenToday:number;giftDate?:string;helpedToday:boolean;helpedDate?:string;unlockedRewards:string[] }
export interface NpcGiftPreference { itemId:string;reaction:'loved'|'liked'|'neutral'|'disliked' }
export interface NpcDefinition { id:string;name:string;shortName:string;occupation:string;description:string;personality:string[];homeLocationId:string;workLocationId?:string;avatarUrl:string;spriteConfig:{icon:string;color:string};scheduleIds:string[];dialogueProfileId:string;shopId?:string;relationshipConfig:{pointsPerLevel:number;maxLevel:number};giftPreferences:NpcGiftPreference[] }
export interface LocationDefinition { id:string;name:string;type:LocationType;backgroundAsset:string;connectedLocationIds:string[];openToPlayer:boolean;icon:string }
export interface NpcShopItem { id:string;itemType:'seed'|'fertilizer'|'gift'|'food'|'tool';referenceId:string;priceGold:number;stock:number;friendshipLevel?:number;rotation?:boolean }
export interface NpcShopState { shopId:string;dayKey:string;rotationSeed:number;rotatingItemIds:string[];purchased:Record<string,number>;forcedState?:'open'|'closed';lastTransactionAt?:string }
export interface NpcFarmPlot { id:string;cropId:string;plantedAt:string;readyAt:string;watered:boolean;weeds:boolean;pests:boolean;helpedByPlayer:boolean }
export interface NpcFarmState { npcId:string;dayKey:string;plots:NpcFarmPlot[];lastUpdatedAt:string }
export interface DialogueProgress { npcId:string;met:boolean;lastDialogueId?:string;talkedDate?:string }
export interface ActiveFoodBuff { foodId:string;type:'growth_speed'|'harvest_xp'|'lucky_yield'|'movement_speed'|'friendship';value:number;startedAt:string;endsAt:string }
export interface FoodDefinition { id:string;name:string;icon:string;description:string;priceGold:number;availableTimeRanges:{startTime:string;endTime:string}[];requiredIngredients?:{itemId:string;quantity:number}[];buff?:{type:ActiveFoodBuff['type'];value:number;durationMinutes:number} }
export interface NpcAmbientAction { id:string;activityType:NpcActivityType;durationSeconds:number;weight:number;animation:string;allowedLocations:string[];dialogueChance?:number }
