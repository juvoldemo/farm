import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { crops, cropById } from '../config/crops'
import { fertilizerById } from '../config/fertilizers'
import { plotUnlockConfig } from '../config/plotUnlockConfig'
import { INITIAL_UNLOCKED_PLOTS, STARTING_COINS } from '../config/economyConfig'
import type { FarmPlot, GameStateData, HarvestGeneticsResult, InventoryItem, ItemType, Player, SeedInstance, Stats } from '../types/game'
import { applyFertilizer as applyFertilizerToCrop, getCropRemainingTime } from '../utils/cropGrowth'
import { calculatePlayerLevel } from '../utils/level'
import { calculateHarvestYield, type HarvestYieldResult } from '../utils/harvestYield'
import { createFarmOrder } from '../services/orderService'
import { weatherDefinitions } from '../config/weatherConfig'
import { createRandomGenerator, randomChance, randomInteger } from '../utils/random'
import { migrateSaveGame, SAVE_VERSION } from '../services/saveMigrationService'
import type { HarvestHistory, RandomEventState, WeatherState } from '../types/game'
import type { ActiveFoodBuff, NpcFarmState, NpcRelationship, NpcRuntimeState, NpcShopState } from '../types/npc'
import { npcs, npcById } from '../config/npcs'
import { foodById, npcShopById } from '../config/npcShops'
import { getNpcStateAtTime } from '../services/npcScheduleService'
import { getNpcDialogue } from '../services/npcDialogueService'
import { applyGeneticYield, calculateGeneticGrowthDuration, eligibleHybridNeighbors, inheritTraits, nextRarity } from '../services/cropGeneticsService'
import { findHybridRecipe } from '../config/hybridRecipes'
import { traitValue } from '../config/geneticsConfig'
import { createRelationship, giftFriendshipPoints, increaseFriendship } from '../services/npcRelationshipService'
import { createNpcShopState, getNpcShopInventory, getNpcShopState } from '../services/npcShopService'
import { createNpcFarmState, getNpcFarmState, helpNpcFarm as helpFarmPlot } from '../services/npcFarmService'

const itemId = (type: ItemType, ref: string) => `${type}:${ref}`
const initialInventory: InventoryItem[] = [
  {id:itemId('seed','cabbage'),itemType:'seed',referenceId:'cabbage',quantity:10},
  {id:itemId('seed','carrot'),itemType:'seed',referenceId:'carrot',quantity:5},
  {id:itemId('fertilizer','small'),itemType:'fertilizer',referenceId:'small',quantity:2},
]
const initialPlots = (): FarmPlot[] => plotUnlockConfig.map(p => ({id:`plot-${p.plotNumber}`,plotNumber:p.plotNumber,isUnlocked:p.plotNumber<=INITIAL_UNLOCKED_PLOTS,unlockPrice:p.price,requiredLevel:p.requiredLevel}))
const initialPlayer = (): Player => ({id:'local-player',name:'Bé Nông Dân',level:1,currentXp:0,gold:STARTING_COINS,energy:20,inventoryCapacity:100,createdAt:new Date().toISOString(),lastLoginAt:new Date().toISOString(),settings:{music:true,sound:true,reducedMotion:false,haptics:true,volume:.55,graphicsQuality:'medium'}})
const initialStats = (): Stats => ({planted:0,harvested:0,sold:0,fertilizersUsed:0,plotsUnlocked:0})
const initialWeather=():WeatherState=>({id:'sunny',startedAt:new Date().toISOString(),endsAt:new Date(Date.now()+20*60_000).toISOString(),seed:Date.now()})
const initialEvent=():RandomEventState=>({claimedToday:0,dayKey:new Date().toISOString().slice(0,10)})
const initialNpcData=(now=Date.now(),weather:WeatherState['id']='sunny')=>({npcStates:Object.fromEntries(npcs.map(npc=>[npc.id,getNpcStateAtTime(npc.id,now,weather)])) as Record<string,NpcRuntimeState>,npcRelationships:Object.fromEntries(npcs.map(npc=>[npc.id,createRelationship(npc.id)])) as Record<string,NpcRelationship>,npcShopStates:Object.fromEntries(npcs.filter(npc=>npc.shopId).map(npc=>[npc.shopId!,createNpcShopState(npc.shopId!,now)])) as Record<string,NpcShopState>,npcFarmStates:{ba:createNpcFarmState(now)} as Record<string,NpcFarmState>,dialogueProgress:Object.fromEntries(npcs.map(npc=>[npc.id,{npcId:npc.id,met:false}])),activeFoodBuffs:[] as ActiveFoodBuff[],lastNpcSyncAt:new Date(now).toISOString()})
const applyWeatherToPlots=(plots:FarmPlot[],weather:(typeof weatherDefinitions)[number],now:number)=>plots.map(plot=>{if(!plot.cropInstance)return plot;const care=weather.cropEffects?.autoWater?{...(plot.cropInstance.care??{water:50,weeds:false,pests:false}),water:100,wateredAt:new Date(now).toISOString()}:plot.cropInstance.care;const speed=weather.cropEffects?.growthSpeedPercent??0,remaining=Math.max(0,new Date(plot.cropInstance.readyAt).getTime()-now),readyAt=speed?new Date(new Date(plot.cropInstance.readyAt).getTime()-remaining*speed/100).toISOString():plot.cropInstance.readyAt;return{...plot,cropInstance:{...plot.cropInstance,care,readyAt,weatherEffects:{rainExperienced:plot.cropInstance.weatherEffects?.rainExperienced||weather.id==='rain'}}}})
let lastHarvestMetaAt=0
const lastHarvestInventoryAt=new Map<string,number>()

interface GameStore extends GameStateData {
  timeOffsetMs: number
  replaceGameData:(data:GameStateData)=>void
  applyServerHarvestState:(data:GameStateData,plotId:string,cropId:string)=>void
  plantCrop:(plotId:string,cropId:string,quickBuy?:boolean,seedInstanceId?:string)=>void
  applyFertilizer:(plotId:string,fertilizerId:string)=>number
  harvestCrop:(plotId:string)=>{quantity:number;xp:number;leveledUp:boolean;yield:HarvestYieldResult;genetics:HarvestGeneticsResult}
  careForCrop:(plotId:string,action:'water'|'weed'|'pest')=>void
  unlockPlot:(plotId:string)=>void
  buyItem:(type:'seed'|'fertilizer',referenceId:string,quantity?:number)=>void
  sellProduce:(cropId:string,quantity:number)=>number
  refreshWeather:(forceId?:WeatherState['id'])=>void
  ensureOrders:()=>void
  deliverOrder:(orderId:string)=>{gold:number;xp:number}
  replaceOrder:(orderId:string)=>void
  spawnRandomEvent:(eventId:string)=>void
  claimRandomEvent:()=>{gold:number;seeds:number}
  syncNpcStates:(now?:number)=>void
  talkToNpc:(npcId:string)=>{text:string;friendshipGained:number}
  giveGiftToNpc:(npcId:string,itemId:string)=>{points:number;reaction:string}
  purchaseFromNpc:(shopId:string,itemId:string)=>number
  sellToNpc:(npcId:string,cropId:string,quantity:number)=>number
  consumeFood:(foodId:string)=>void
  helpNpcFarm:(plotId:string,action:'water'|'weed'|'pest')=>{gold:number;xp:number;friendship:number}
  completeNpcQuest:(npcId:string)=>{gold:number;xp:number;friendship:number}
  devSetNpcLocation:(npcId:string,locationId:string)=>void
  devSetShopState:(shopId:string,state?:'open'|'closed')=>void
  devFriendship:(npcId:string,points:number)=>void
  devResetNpcs:()=>void
  updateSettings:(settings:Partial<Player['settings']>)=>void
  setTutorialStep:(step:number)=>void
  markLogin:()=>void
  devAddGold:()=>void; devLevelUp:()=>void; devFinishCrops:()=>void; devUnlockAll:()=>void; devSkipTime:(seconds:number)=>void
  resetGame:()=>void
}

const quantityOf = (items:InventoryItem[],type:ItemType,ref:string) => items.find(i=>i.itemType===type&&i.referenceId===ref)?.quantity ?? 0
const totalItems = (items:InventoryItem[]) => items.reduce((sum,i)=>sum+i.quantity,0)
const changeItem = (items:InventoryItem[],type:ItemType,ref:string,delta:number):InventoryItem[] => {
  const id=itemId(type,ref), existing=items.find(i=>i.id===id), next=(existing?.quantity??0)+delta
  if (next < 0) throw new Error('Không đủ vật phẩm trong kho.')
  if (!existing) return next ? [...items,{id,itemType:type,referenceId:ref,quantity:next}] : items
  return next ? items.map(i=>i.id===id?{...i,quantity:next}:i) : items.filter(i=>i.id!==id)
}

export const useGameStore = create<GameStore>()(persist((set,get)=>({
  version:SAVE_VERSION, player:initialPlayer(), plots:initialPlots(), inventory:initialInventory, specialSeeds:[],hybridDiscoveries:[],stats:initialStats(), orders:[],currentWeather:initialWeather(),randomEventState:initialEvent(),harvestHistory:[],...initialNpcData(),lastSavedAt:new Date().toISOString(), tutorialStep:0, timeOffsetMs:0,
  replaceGameData:data=>set({...migrateSaveGame(data),timeOffsetMs:0}),
  applyServerHarvestState:(data,plotId,cropId)=>set(state=>{const remote=migrateSaveGame(data),at=new Date(remote.lastSavedAt).getTime(),remotePlot=remote.plots.find(plot=>plot.id===plotId),plots=remotePlot?state.plots.map(plot=>plot.id===plotId?remotePlot:plot):state.plots;let inventory=state.inventory
    if(at>=(lastHarvestInventoryAt.get(cropId)??0)){lastHarvestInventoryAt.set(cropId,at);const item=remote.inventory.find(value=>value.itemType==='produce'&&value.referenceId===cropId);inventory=state.inventory.filter(value=>!(value.itemType==='produce'&&value.referenceId===cropId));if(item)inventory=[...inventory,item]}
    if(at<lastHarvestMetaAt)return{plots,inventory}
    lastHarvestMetaAt=at
    return{plots,inventory,player:{...state.player,level:remote.player.level,currentXp:remote.player.currentXp},stats:{...state.stats,harvested:remote.stats.harvested},specialSeeds:remote.specialSeeds,hybridDiscoveries:remote.hybridDiscoveries,harvestHistory:remote.harvestHistory,lastSavedAt:new Date(Math.max(at,new Date(state.lastSavedAt).getTime())).toISOString()}
  }),
  plantCrop:(plotId,cropId,quickBuy=false,seedInstanceId)=>set(state=>{
    const plot=state.plots.find(p=>p.id===plotId), crop=cropById(cropId)
    if(!plot?.isUnlocked||plot.cropInstance) throw new Error('Luống đất chưa sẵn sàng.')
    if(!crop) throw new Error('Không tìm thấy cây trồng.')
    if(state.player.level<crop.requiredLevel) throw new Error(`Cần đạt cấp ${crop.requiredLevel}.`)
    let inventory=state.inventory, player=state.player,specialSeeds=state.specialSeeds??[]
    const special=seedInstanceId?specialSeeds.find(seed=>seed.id===seedInstanceId&&seed.status==='inventory'&&seed.cropId===cropId):undefined
    if(seedInstanceId&&!special)throw new Error('Hạt giống đặc biệt không còn khả dụng.')
    if(special)specialSeeds=specialSeeds.map(seed=>seed.id===special.id?{...seed,status:'planted' as const,updatedAt:new Date().toISOString()}:seed)
    else if(quantityOf(inventory,'seed',cropId)<1){
      if(!quickBuy) throw new Error('Bạn chưa có hạt giống này.')
      if(player.gold<crop.seedPrice) throw new Error('Không đủ vàng mua hạt giống.')
      player={...player,gold:player.gold-crop.seedPrice}
    } else inventory=changeItem(inventory,'seed',cropId,-1)
    const now=Date.now()+state.timeOffsetMs,growthBuff=state.activeFoodBuffs.find(buff=>buff.type==='growth_speed'&&new Date(buff.endsAt).getTime()>now)?.value??0,plantedAt=new Date(now).toISOString(),effectiveDuration=calculateGeneticGrowthDuration(crop.growthDurationSeconds,special?.traits,growthBuff/100,Math.max(30,crop.growthDurationSeconds*.6)),readyAt=new Date(now+effectiveDuration*1000).toISOString()
    const cropRandom=createRandomGenerator(now+plot.plotNumber)
    const instance={id:`crop-${now}-${plotId}`,cropId,plotId,plantedAt,readyAt,baseGrowthDuration:crop.growthDurationSeconds,calculatedGrowthDuration:effectiveDuration,totalReductionSeconds:crop.growthDurationSeconds-effectiveDuration,fertilizerUsage:[],lastCalculatedAt:plantedAt,plantedSeedInstanceId:special?.id,rarity:special?.rarity??'common' as const,traits:special?.traits??[],weatherEffects:{rainExperienced:state.currentWeather.id==='rain'},source:special?.source??'shop' as const,parentSeedIds:special?.parentSeedIds??[],generation:special?.generation??0,hybridId:special?.hybridId,care:{water:50,weeds:randomChance(.22,cropRandom),pests:randomChance(.14,cropRandom)}}
    return {inventory,specialSeeds,player,plots:state.plots.map(p=>p.id===plotId?{...p,cropInstance:instance}:p),stats:{...state.stats,planted:state.stats.planted+1},lastSavedAt:new Date().toISOString()}
  }),
  applyFertilizer:(plotId,fertilizerId)=>{
    let reduced=0
    set(state=>{
      const plot=state.plots.find(p=>p.id===plotId), fertilizer=fertilizerById(fertilizerId)
      if(!plot?.cropInstance||!fertilizer) throw new Error('Không thể bón phân lúc này.')
      if(quantityOf(state.inventory,'fertilizer',fertilizerId)<1) throw new Error('Bạn không có loại phân này.')
      const result=applyFertilizerToCrop(plot.cropInstance,fertilizer,Date.now()+state.timeOffsetMs); reduced=result.reductionSeconds
      return {inventory:changeItem(state.inventory,'fertilizer',fertilizerId,-1),plots:state.plots.map(p=>p.id===plotId?{...p,cropInstance:result.instance}:p),stats:{...state.stats,fertilizersUsed:state.stats.fertilizersUsed+1},lastSavedAt:new Date().toISOString()}
    }); return reduced
  },
  careForCrop:(plotId,action)=>set(state=>{const plot=state.plots.find(p=>p.id===plotId);if(!plot?.cropInstance)throw new Error('Luống này chưa có cây.');if(getCropRemainingTime(plot.cropInstance,Date.now()+state.timeOffsetMs)<=0)throw new Error('Cây đã chín.');const now=new Date().toISOString(),care=plot.cropInstance.care??{water:50,weeds:false,pests:false};const next=action==='water'?{...care,water:100,wateredAt:now}:action==='weed'?{...care,weeds:false,weededAt:now}:{...care,pests:false,pestsClearedAt:now};return{plots:state.plots.map(p=>p.id===plotId?{...p,cropInstance:{...p.cropInstance!,care:next}}:p),lastSavedAt:now}}),
  harvestCrop:(plotId)=>{
    let result!:{quantity:number;xp:number;leveledUp:boolean;yield:HarvestYieldResult;genetics:HarvestGeneticsResult}
    set(state=>{
      const plot=state.plots.find(p=>p.id===plotId), instance=plot?.cropInstance, crop=instance?cropById(instance.cropId):undefined
      if(!plot||!instance||!crop) throw new Error('Không có cây để thu hoạch.')
      if(getCropRemainingTime(instance,Date.now()+state.timeOffsetMs)>0) throw new Error('Cây chưa chín.')
      const now=Date.now()+state.timeOffsetMs,luckyBuff=state.activeFoodBuffs.find(buff=>buff.type==='lucky_yield'&&new Date(buff.endsAt).getTime()>now)?.value??0,xpBuff=state.activeFoodBuffs.find(buff=>buff.type==='harvest_xp'&&new Date(buff.endsAt).getTime()>now)?.value??0
      const yieldResult=calculateHarvestYield({crop,careState:instance.care,weather:state.currentWeather.id,luckyChanceBonus:luckyBuff,randomSeed:new Date(instance.plantedAt).getTime()^Date.now()})
      const quantity=applyGeneticYield(yieldResult.finalQuantity,instance.traits,!!instance.weatherEffects?.rainExperienced)
      if(totalItems(state.inventory)+quantity>state.player.inventoryCapacity) throw new Error('Kho đã đầy! Hãy bán bớt nông sản.')
      const xp=Math.round(crop.xpReward*(100+xpBuff)/100),level=calculatePlayerLevel(state.player.level,state.player.currentXp,xp)
      const traitMessages:string[]=[];if(quantity>yieldResult.finalQuantity)traitMessages.push(`Đặc tính sản lượng: +${quantity-yieldResult.finalQuantity} sản phẩm`)
      const random=createRandomGenerator(new Date(instance.plantedAt).getTime()^Date.now()),giant=instance.traits?.find(t=>t.traitId==='giant_fruit'),giantQuantity=giant&&randomChance(traitValue('giant_fruit',giant.level),random)?1:0
      if(giantQuantity)traitMessages.push('Xuất hiện quả khổng lồ!')
      const qualityTrait=instance.traits?.find(t=>t.traitId==='high_quality'),qualityRoll=random(),quality=qualityRoll<(qualityTrait?traitValue('high_quality',qualityTrait.level)/3:0)?'gold':qualityRoll<(qualityTrait?traitValue('high_quality',qualityTrait.level):0)?'silver':'normal'
      const neighbors=eligibleHybridNeighbors(plot,state.plots,now),mate=neighbors[0]?.cropInstance,recipe=mate?findHybridRecipe(instance.cropId,mate.cropId):undefined
      let hybridSeed:SeedInstance|undefined,hybridDiscoveries=state.hybridDiscoveries??[],specialSeeds=(state.specialSeeds??[]).filter(seed=>seed.id!==instance.plantedSeedInstanceId)
      const hybridChance=mate?(recipe?.baseChance??.06):0
      if(mate&&randomChance(hybridChance,random)){const traits=inheritTraits(instance.traits??[],mate.traits??[],random,recipe?.allowedTraits),createdAt=new Date(now).toISOString();hybridSeed={id:`seed-${crypto.randomUUID()}`,cropId:recipe?.resultCropId??instance.cropId,rarity:recipe?.resultRarity??nextRarity(instance.rarity??'common',mate.rarity??'common'),traits,source:'hybrid',parentSeedIds:[instance.plantedSeedInstanceId,mate.plantedSeedInstanceId].filter(Boolean) as string[],generation:Math.max(instance.generation??0,mate.generation??0)+1,hybridId:recipe?.resultHybridId,status:'inventory',createdAt,updatedAt:createdAt};specialSeeds=[...specialSeeds,hybridSeed];traitMessages.push('Lai giống thành công!');if(recipe){const found=hybridDiscoveries.find(d=>d.recipeId===recipe.id);hybridDiscoveries=found?hybridDiscoveries.map(d=>d.recipeId===recipe.id?{...d,totalCreated:d.totalCreated+1,highestGeneration:Math.max(d.highestGeneration,hybridSeed!.generation)}:d):[...hybridDiscoveries,{recipeId:recipe.id,discoveredAt:createdAt,totalCreated:1,highestGeneration:hybridSeed.generation}]}}
      const genetics:HarvestGeneticsResult={traitMessages,quality,giantQuantity,hybridSeed,hybridAttempted:!!mate}
      result={quantity,xp,leveledUp:level.level>state.player.level,yield:yieldResult,genetics}
      const history:HarvestHistory={id:`harvest-${Date.now()}-${plotId}`,cropId:crop.id,plotId,harvestedAt:new Date().toISOString(),baseQuantity:yieldResult.baseQuantity,bonusQuantity:quantity-yieldResult.baseQuantity,finalQuantity:quantity,isLuckyHarvest:yieldResult.isLuckyHarvest,isPerfectHarvest:yieldResult.isPerfectHarvest,xpReceived:xp}
      const regrow=crop.repeatableHarvest&&crop.regrowDurationSeconds?{...instance,id:`crop-${now}-${plotId}`,plantedAt:new Date(now).toISOString(),readyAt:new Date(now+crop.regrowDurationSeconds*1000).toISOString(),baseGrowthDuration:crop.regrowDurationSeconds,calculatedGrowthDuration:crop.regrowDurationSeconds,totalReductionSeconds:0,fertilizerUsage:[],lastCalculatedAt:new Date(now).toISOString()}:undefined
      return {inventory:changeItem(state.inventory,'produce',crop.id,quantity),specialSeeds,hybridDiscoveries,plots:state.plots.map(p=>p.id===plotId?{...p,cropInstance:regrow}:p),player:{...state.player,level:level.level,currentXp:level.currentXp},stats:{...state.stats,harvested:state.stats.harvested+quantity},harvestHistory:[history,...state.harvestHistory].slice(0,100),lastSavedAt:new Date().toISOString()}
    }); return result
  },
  unlockPlot:(plotId)=>set(state=>{const plot=state.plots.find(p=>p.id===plotId);if(!plot||plot.isUnlocked)throw new Error('Luống đất đã mở.');if(state.player.level<plot.requiredLevel)throw new Error(`Cần đạt cấp ${plot.requiredLevel}.`);if(state.player.gold<plot.unlockPrice)throw new Error('Không đủ vàng để mở đất.');return{player:{...state.player,gold:state.player.gold-plot.unlockPrice},plots:state.plots.map(p=>p.id===plotId?{...p,isUnlocked:true}:p),stats:{...state.stats,plotsUnlocked:state.stats.plotsUnlocked+1},lastSavedAt:new Date().toISOString()}}),
  buyItem:(type,referenceId,quantity=1)=>set(state=>{const def=type==='seed'?cropById(referenceId):fertilizerById(referenceId);if(!def)throw new Error('Không tìm thấy vật phẩm.');const req='requiredLevel'in def?def.requiredLevel:1;if(state.player.level<req)throw new Error(`Cần đạt cấp ${req}.`);const gold=('seedPrice'in def?def.seedPrice:def.priceGold)*quantity;if(state.player.gold<gold)throw new Error('Không đủ vàng.');if(totalItems(state.inventory)+quantity>state.player.inventoryCapacity)throw new Error('Kho đã đầy.');return{player:{...state.player,gold:state.player.gold-gold},inventory:changeItem(state.inventory,type,referenceId,quantity),lastSavedAt:new Date().toISOString()}}),
  sellProduce:(cropId,quantity)=>{let earned=0;set(state=>{const crop=cropById(cropId);if(!crop||quantity<=0)throw new Error('Số lượng không hợp lệ.');if(quantityOf(state.inventory,'produce',cropId)<quantity)throw new Error('Không đủ nông sản.');earned=crop.sellPrice*quantity;return{player:{...state.player,gold:state.player.gold+earned},inventory:changeItem(state.inventory,'produce',cropId,-quantity),stats:{...state.stats,sold:state.stats.sold+quantity},lastSavedAt:new Date().toISOString()}});return earned},
  refreshWeather:forceId=>set(state=>{const now=Date.now()+state.timeOffsetMs;if(!forceId&&new Date(state.currentWeather.endsAt).getTime()>now)return{};const random=createRandomGenerator(state.currentWeather.seed+Math.floor(now/60_000)),total=weatherDefinitions.reduce((s,w)=>s+w.weight,0);let roll=randomInteger(1,total,random),chosen=weatherDefinitions[0];for(const item of weatherDefinitions){roll-=item.weight;if(roll<=0){chosen=item;break}}if(forceId)chosen=weatherDefinitions.find(w=>w.id===forceId)??chosen;const currentWeather={id:chosen.id,startedAt:new Date(now).toISOString(),endsAt:new Date(now+chosen.durationMinutes*60_000).toISOString(),seed:state.currentWeather.seed+1};return{currentWeather,plots:applyWeatherToPlots(state.plots,chosen,now),lastSavedAt:new Date().toISOString()}}),
  ensureOrders:()=>set(state=>{if(state.orders.filter(o=>o.status==='active').length>=3)return{};const missing=3-state.orders.filter(o=>o.status==='active').length,created=Array.from({length:missing},(_,i)=>createFarmOrder(state.player.level,Date.now()+i*997));return{orders:[...state.orders.filter(o=>o.status==='active'),...created],lastSavedAt:new Date().toISOString()}}),
  deliverOrder:orderId=>{let reward={gold:0,xp:0};set(state=>{const order=state.orders.find(o=>o.id===orderId&&o.status==='active');if(!order)throw new Error('Đơn hàng không còn hiệu lực.');for(const item of order.items)if(quantityOf(state.inventory,'produce',item.produceId)<item.quantity)throw new Error('Chưa đủ nông sản để giao.');let inventory=state.inventory;for(const item of order.items)inventory=changeItem(inventory,'produce',item.produceId,-item.quantity);const level=calculatePlayerLevel(state.player.level,state.player.currentXp,order.rewardXp);reward={gold:order.rewardGold,xp:order.rewardXp};return{inventory,player:{...state.player,gold:state.player.gold+reward.gold,level:level.level,currentXp:level.currentXp},orders:state.orders.filter(o=>o.id!==orderId),lastSavedAt:new Date().toISOString()}});get().ensureOrders();return reward},
  replaceOrder:orderId=>set(state=>({orders:[...state.orders.filter(o=>o.id!==orderId),createFarmOrder(state.player.level,Date.now())],lastSavedAt:new Date().toISOString()})),
  spawnRandomEvent:eventId=>set(state=>{const today=new Date().toISOString().slice(0,10);return{randomEventState:{...state.randomEventState,claimedToday:state.randomEventState.dayKey===today?state.randomEventState.claimedToday:0,dayKey:today,activeEventId:eventId,spawnedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+18_000).toISOString(),lastEventAt:new Date().toISOString()}}}),
  claimRandomEvent:()=>{let reward={gold:0,seeds:0};set(state=>{if(!state.randomEventState.activeEventId||!state.randomEventState.expiresAt||new Date(state.randomEventState.expiresAt).getTime()<Date.now())throw new Error('Sự kiện đã kết thúc.');const id=state.randomEventState.activeEventId,random=createRandomGenerator(new Date(state.randomEventState.spawnedAt!).getTime());reward=id==='seed-bird'?{gold:0,seeds:2}:{gold:randomInteger(id==='tiny-chest'?30:5,id==='tiny-chest'?80:20,random),seeds:0};let inventory=state.inventory;if(reward.seeds)inventory=changeItem(inventory,'seed',crops.filter(c=>c.requiredLevel<=state.player.level)[0].id,reward.seeds);return{inventory,player:{...state.player,gold:state.player.gold+reward.gold},randomEventState:{...state.randomEventState,activeEventId:undefined,expiresAt:undefined,claimedToday:state.randomEventState.claimedToday+1},lastSavedAt:new Date().toISOString()}});return reward},
  syncNpcStates:(at)=>set(state=>{const now=at??Date.now()+state.timeOffsetMs,day=new Date(now).toISOString().slice(0,10),npcStates=Object.fromEntries(npcs.map(npc=>[npc.id,getNpcStateAtTime(npc.id,now,state.currentWeather.id)])),npcShopStates=Object.fromEntries(Object.entries(state.npcShopStates).map(([id,shop])=>[id,shop.dayKey===day?shop:createNpcShopState(id,now)])),farm=getNpcFarmState(state.npcFarmStates.ba,now);return{npcStates,npcShopStates,npcFarmStates:{...state.npcFarmStates,ba:farm},activeFoodBuffs:state.activeFoodBuffs.filter(buff=>new Date(buff.endsAt).getTime()>now),lastNpcSyncAt:new Date(now).toISOString()}}),
  talkToNpc:npcId=>{let result={text:'',friendshipGained:0};set(state=>{const npc=npcById(npcId),runtime=state.npcStates[npcId],relationship=state.npcRelationships[npcId];if(!npc||!runtime||!relationship)throw new Error('Không tìm thấy người hàng xóm.');if(runtime.currentActivity==='sleeping')throw new Error('Trong nhà đã tắt đèn. Có lẽ họ đang ngủ.');const now=Date.now()+state.timeOffsetMs,today=new Date(now).toISOString().slice(0,10),friendshipGained=relationship.lastTalkedDate===today?0:5,nextRel=increaseFriendship({...relationship,lastTalkedDate:today},npc,friendshipGained),line=getNpcDialogue({npcId,state:runtime,weatherId:state.currentWeather.id,friendshipLevel:nextRel.friendshipLevel,now});result={text:line.text,friendshipGained};return{npcRelationships:{...state.npcRelationships,[npcId]:nextRel},dialogueProgress:{...state.dialogueProgress,[npcId]:{npcId,met:true,lastDialogueId:line.id,talkedDate:today}},lastSavedAt:new Date().toISOString()}});return result},
  giveGiftToNpc:(npcId,itemId)=>{let result={points:0,reaction:'neutral'};set(state=>{const npc=npcById(npcId),relationship=state.npcRelationships[npcId];if(!npc||!relationship)throw new Error('Không tìm thấy người hàng xóm.');const now=Date.now()+state.timeOffsetMs,today=new Date(now).toISOString().slice(0,10),given=relationship.giftDate===today?relationship.giftsGivenToday:0;if(given>=2)throw new Error('Hôm nay bạn đã tặng đủ quà cho người này.');const item=state.inventory.find(i=>i.referenceId===itemId&&i.quantity>0);if(!item)throw new Error('Bạn không có món quà này.');const reaction=npc.giftPreferences.find(pref=>pref.itemId===itemId)?.reaction??'neutral',points=giftFriendshipPoints(reaction),next=increaseFriendship({...relationship,giftDate:today,giftsGivenToday:given+1},npc,points);result={points,reaction};return{inventory:changeItem(state.inventory,item.itemType,itemId,-1),npcRelationships:{...state.npcRelationships,[npcId]:next},lastSavedAt:new Date().toISOString()}});return result},
  purchaseFromNpc:(shopId,itemId)=>{let paid=0;set(state=>{const shop=npcShopById(shopId),shopState=state.npcShopStates[shopId],owner=shop?npcById(shop.ownerNpcId):undefined,runtime=owner?state.npcStates[owner.id]:undefined,relationship=owner?state.npcRelationships[owner.id]:undefined,now=Date.now()+state.timeOffsetMs;if(!shop||!shopState||!owner||!runtime||!relationship)throw new Error('Cửa hàng không tồn tại.');const availability=getNpcShopState(shopId,shopState,runtime,now);if(availability.availability!=='open')throw new Error(availability.reason);const item=getNpcShopInventory(shopId,shopState,relationship,now).find(entry=>entry.id===itemId);if(!item)throw new Error('Mặt hàng hiện không có bán.');if((shopState.purchased[item.id]??0)>=item.stock)throw new Error('Mặt hàng đã hết.');const discount=Math.min(10,relationship.friendshipLevel*2);paid=Math.ceil(item.priceGold*(100-discount)/100);if(state.player.gold<paid)throw new Error('Không đủ vàng.');if(totalItems(state.inventory)+1>state.player.inventoryCapacity)throw new Error('Kho đã đầy.');return{player:{...state.player,gold:state.player.gold-paid},inventory:changeItem(state.inventory,item.itemType,item.referenceId,1),npcShopStates:{...state.npcShopStates,[shopId]:{...shopState,purchased:{...shopState.purchased,[item.id]:(shopState.purchased[item.id]??0)+1},lastTransactionAt:new Date(now).toISOString()}},lastSavedAt:new Date().toISOString()}});return paid},
  sellToNpc:(npcId,cropId,quantity)=>{let earned=0;set(state=>{const crop=cropById(cropId);if(!crop||quantity<=0)throw new Error('Nông sản không hợp lệ.');const accepted=npcId==='hoa'?['cabbage','carrot','strawberry']:npcId==='lan'?['cabbage','carrot','tomato','corn','potato','strawberry']:['corn','pumpkin','potato'];if(!accepted.includes(cropId))throw new Error('Người này không mua loại nông sản đó.');if(quantityOf(state.inventory,'produce',cropId)<quantity)throw new Error('Không đủ nông sản.');earned=Math.round(crop.sellPrice*quantity*1.15);return{inventory:changeItem(state.inventory,'produce',cropId,-quantity),player:{...state.player,gold:state.player.gold+earned},lastSavedAt:new Date().toISOString()}});return earned},
  consumeFood:foodId=>set(state=>{const food=foodById(foodId);if(!food||quantityOf(state.inventory,'food',foodId)<1)throw new Error('Bạn không có món ăn này.');const now=Date.now()+state.timeOffsetMs,buff=food.buff?{foodId,type:food.buff.type,value:food.buff.value,startedAt:new Date(now).toISOString(),endsAt:new Date(now+food.buff.durationMinutes*60_000).toISOString()}:undefined;return{inventory:changeItem(state.inventory,'food',foodId,-1),activeFoodBuffs:buff?[...state.activeFoodBuffs.filter(item=>item.type!==buff.type),buff]:state.activeFoodBuffs,lastSavedAt:new Date().toISOString()}}),
  helpNpcFarm:(plotId,action)=>{let reward={gold:0,xp:0,friendship:0};set(state=>{const farm=getNpcFarmState(state.npcFarmStates.ba,Date.now()+state.timeOffsetMs),plot=farm.plots.find(p=>p.id===plotId);if(!plot)throw new Error('Không tìm thấy luống.');if(plot.helpedByPlayer)throw new Error('Bạn đã giúp luống này rồi.');if(action==='water'&&plot.watered||action==='weed'&&!plot.weeds||action==='pest'&&!plot.pests)throw new Error('Luống này chưa cần thao tác đó.');const npc=npcById('ba')!,relationship=state.npcRelationships.ba,nextRel=increaseFriendship(relationship,npc,10),level=calculatePlayerLevel(state.player.level,state.player.currentXp,8);reward={gold:20,xp:8,friendship:10};return{npcFarmStates:{...state.npcFarmStates,ba:helpFarmPlot(farm,plotId,action)},npcRelationships:{...state.npcRelationships,ba:nextRel},player:{...state.player,gold:state.player.gold+20,level:level.level,currentXp:level.currentXp},lastSavedAt:new Date().toISOString()}});return reward},
  completeNpcQuest:npcId=>{let reward={gold:0,xp:0,friendship:0};set(state=>{const npc=npcById(npcId),relationship=state.npcRelationships[npcId];if(!npc||!relationship)throw new Error('Không tìm thấy nhiệm vụ.');const today=new Date(Date.now()+state.timeOffsetMs).toISOString().slice(0,10);if(relationship.helpedDate===today)throw new Error('Hôm nay bạn đã hoàn thành nhiệm vụ này.');const requirement=npcId==='hoa'?{crop:'cabbage',quantity:10}:npcId==='lan'?{crop:'tomato',quantity:3}:{crop:'corn',quantity:5};if(quantityOf(state.inventory,'produce',requirement.crop)<requirement.quantity)throw new Error('Bạn chưa đủ nguyên liệu nhiệm vụ.');const gold=npcId==='hoa'?120:npcId==='lan'?150:140,xp=20,friendship=20,level=calculatePlayerLevel(state.player.level,state.player.currentXp,xp),nextRel=increaseFriendship({...relationship,helpedToday:true,helpedDate:today},npc,friendship);reward={gold,xp,friendship};return{inventory:changeItem(state.inventory,'produce',requirement.crop,-requirement.quantity),player:{...state.player,gold:state.player.gold+gold,level:level.level,currentXp:level.currentXp},npcRelationships:{...state.npcRelationships,[npcId]:nextRel},lastSavedAt:new Date().toISOString()}});return reward},
  devSetNpcLocation:(npcId,locationId)=>set(state=>({npcStates:{...state.npcStates,[npcId]:{...state.npcStates[npcId],currentLocationId:locationId,currentActivity:'working',scheduleEntryId:'dev-override',lastUpdatedAt:new Date().toISOString()}}})),
  devSetShopState:(shopId,forcedState)=>set(state=>({npcShopStates:{...state.npcShopStates,[shopId]:{...state.npcShopStates[shopId],forcedState}}})),
  devFriendship:(npcId,points)=>set(state=>{const npc=npcById(npcId),relationship=state.npcRelationships[npcId];return npc&&relationship?{npcRelationships:{...state.npcRelationships,[npcId]:points===0?createRelationship(npcId):increaseFriendship(relationship,npc,points)}}:{}}),
  devResetNpcs:()=>set(state=>initialNpcData(Date.now()+state.timeOffsetMs,state.currentWeather.id)),
  updateSettings:settings=>set(state=>({player:{...state.player,settings:{...state.player.settings,...settings}}})), setTutorialStep:tutorialStep=>set({tutorialStep}), markLogin:()=>set(state=>({player:{...state.player,lastLoginAt:new Date().toISOString()}})),
  devAddGold:()=>set(s=>({player:{...s.player,gold:s.player.gold+10000}})),devLevelUp:()=>set(s=>({player:{...s.player,level:s.player.level+1,currentXp:0}})),devFinishCrops:()=>set(s=>({plots:s.plots.map(p=>p.cropInstance?{...p,cropInstance:{...p.cropInstance,readyAt:new Date(Date.now()+s.timeOffsetMs).toISOString()}}:p)})),devUnlockAll:()=>set(s=>({plots:s.plots.map(p=>({...p,isUnlocked:true}))})),devSkipTime:seconds=>set(s=>({timeOffsetMs:s.timeOffsetMs+seconds*1000})),
  resetGame:()=>set({version:SAVE_VERSION,player:initialPlayer(),plots:initialPlots(),inventory:initialInventory,specialSeeds:[],hybridDiscoveries:[],stats:initialStats(),orders:[],currentWeather:initialWeather(),randomEventState:initialEvent(),harvestHistory:[],...initialNpcData(),lastSavedAt:new Date().toISOString(),tutorialStep:0,timeOffsetMs:0}),
}),{
  name:'happy-farm-save-v1',
  version:SAVE_VERSION,
  migrate:persisted=>migrateSaveGame(persisted),
  // Luôn chuẩn hóa dữ liệu hydrate, kể cả cache đã mang version mới nhưng thiếu field.
  merge:(persisted,current)=>{
    try{return {...current,...migrateSaveGame(persisted)}}
    catch(error){if(import.meta.env.DEV)console.error('Cache game không hợp lệ, dùng state an toàn:',error);return current}
  },
}))

export const getGameSnapshot = ():GameStateData => {
  const {version,player,plots,inventory,specialSeeds,hybridDiscoveries,stats,orders,currentWeather,randomEventState,harvestHistory,npcStates,npcRelationships,npcShopStates,npcFarmStates,dialogueProgress,activeFoodBuffs,lastNpcSyncAt,lastSavedAt,tutorialStep}=useGameStore.getState()
  return {version,player,plots,inventory,specialSeeds:specialSeeds??[],hybridDiscoveries:hybridDiscoveries??[],stats,orders,currentWeather,randomEventState,harvestHistory,npcStates,npcRelationships,npcShopStates,npcFarmStates,dialogueProgress,activeFoodBuffs,lastNpcSyncAt,lastSavedAt,tutorialStep}
}

export { crops }
