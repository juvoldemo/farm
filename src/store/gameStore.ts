import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { crops, cropById } from '../config/crops'
import { fertilizerById } from '../config/fertilizers'
import { plotUnlockConfig } from '../config/plotUnlockConfig'
import type { FarmPlot, GameStateData, InventoryItem, ItemType, Player, Stats } from '../types/game'
import { applyFertilizer as applyFertilizerToCrop, getCropRemainingTime } from '../utils/cropGrowth'
import { calculatePlayerLevel } from '../utils/level'

const itemId = (type: ItemType, ref: string) => `${type}:${ref}`
const initialInventory: InventoryItem[] = [
  {id:itemId('seed','cabbage'),itemType:'seed',referenceId:'cabbage',quantity:10},
  {id:itemId('seed','carrot'),itemType:'seed',referenceId:'carrot',quantity:5},
  {id:itemId('fertilizer','small'),itemType:'fertilizer',referenceId:'small',quantity:2},
]
const initialPlots = (): FarmPlot[] => plotUnlockConfig.map(p => ({id:`plot-${p.plotNumber}`,plotNumber:p.plotNumber,isUnlocked:p.plotNumber<=3,unlockPrice:p.price,requiredLevel:p.requiredLevel}))
const initialPlayer = (): Player => ({id:'local-player',name:'Bé Nông Dân',level:1,currentXp:0,gold:300,diamonds:5,energy:20,inventoryCapacity:100,createdAt:new Date().toISOString(),lastLoginAt:new Date().toISOString(),settings:{music:true,sound:true,reducedMotion:false}})
const initialStats = (): Stats => ({planted:0,harvested:0,sold:0,fertilizersUsed:0,plotsUnlocked:0})

interface GameStore extends GameStateData {
  timeOffsetMs: number
  replaceGameData:(data:GameStateData)=>void
  plantCrop:(plotId:string,cropId:string,quickBuy?:boolean)=>void
  applyFertilizer:(plotId:string,fertilizerId:string)=>number
  harvestCrop:(plotId:string)=>{quantity:number;xp:number;leveledUp:boolean}
  unlockPlot:(plotId:string)=>void
  buyItem:(type:'seed'|'fertilizer',referenceId:string,quantity?:number)=>void
  sellProduce:(cropId:string,quantity:number)=>number
  updateSettings:(settings:Partial<Player['settings']>)=>void
  setTutorialStep:(step:number)=>void
  markLogin:()=>void
  devAddGold:()=>void; devAddDiamonds:()=>void; devLevelUp:()=>void; devFinishCrops:()=>void; devUnlockAll:()=>void; devSkipTime:(seconds:number)=>void
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
  version:1, player:initialPlayer(), plots:initialPlots(), inventory:initialInventory, stats:initialStats(), lastSavedAt:new Date().toISOString(), tutorialStep:0, timeOffsetMs:0,
  replaceGameData:data=>set({version:data.version,player:data.player,plots:data.plots,inventory:data.inventory,stats:data.stats,lastSavedAt:data.lastSavedAt,tutorialStep:data.tutorialStep,timeOffsetMs:0}),
  plantCrop:(plotId,cropId,quickBuy=false)=>set(state=>{
    const plot=state.plots.find(p=>p.id===plotId), crop=cropById(cropId)
    if(!plot?.isUnlocked||plot.cropInstance) throw new Error('Luống đất chưa sẵn sàng.')
    if(!crop) throw new Error('Không tìm thấy cây trồng.')
    if(state.player.level<crop.requiredLevel) throw new Error(`Cần đạt cấp ${crop.requiredLevel}.`)
    let inventory=state.inventory, player=state.player
    if(quantityOf(inventory,'seed',cropId)<1){
      if(!quickBuy) throw new Error('Bạn chưa có hạt giống này.')
      if(player.gold<crop.seedPrice) throw new Error('Không đủ vàng mua hạt giống.')
      player={...player,gold:player.gold-crop.seedPrice}
    } else inventory=changeItem(inventory,'seed',cropId,-1)
    const now=Date.now()+state.timeOffsetMs, plantedAt=new Date(now).toISOString(), readyAt=new Date(now+crop.growthDurationSeconds*1000).toISOString()
    const instance={id:`crop-${now}-${plotId}`,cropId,plotId,plantedAt,readyAt,baseGrowthDuration:crop.growthDurationSeconds,totalReductionSeconds:0,fertilizerUsage:[],lastCalculatedAt:plantedAt}
    return {inventory,player,plots:state.plots.map(p=>p.id===plotId?{...p,cropInstance:instance}:p),stats:{...state.stats,planted:state.stats.planted+1},lastSavedAt:new Date().toISOString()}
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
  harvestCrop:(plotId)=>{
    let result={quantity:0,xp:0,leveledUp:false}
    set(state=>{
      const plot=state.plots.find(p=>p.id===plotId), instance=plot?.cropInstance, crop=instance?cropById(instance.cropId):undefined
      if(!plot||!instance||!crop) throw new Error('Không có cây để thu hoạch.')
      if(getCropRemainingTime(instance,Date.now()+state.timeOffsetMs)>0) throw new Error('Cây chưa chín.')
      const quantity=Math.floor(Math.random()*(crop.harvestQuantityMax-crop.harvestQuantityMin+1))+crop.harvestQuantityMin
      if(totalItems(state.inventory)+quantity>state.player.inventoryCapacity) throw new Error('Kho đã đầy! Hãy bán bớt nông sản.')
      const level=calculatePlayerLevel(state.player.level,state.player.currentXp,crop.xpReward)
      result={quantity,xp:crop.xpReward,leveledUp:level.level>state.player.level}
      return {inventory:changeItem(state.inventory,'produce',crop.id,quantity),plots:state.plots.map(p=>p.id===plotId?{...p,cropInstance:undefined}:p),player:{...state.player,level:level.level,currentXp:level.currentXp},stats:{...state.stats,harvested:state.stats.harvested+quantity},lastSavedAt:new Date().toISOString()}
    }); return result
  },
  unlockPlot:(plotId)=>set(state=>{const plot=state.plots.find(p=>p.id===plotId);if(!plot||plot.isUnlocked)throw new Error('Luống đất đã mở.');if(state.player.level<plot.requiredLevel)throw new Error(`Cần đạt cấp ${plot.requiredLevel}.`);if(state.player.gold<plot.unlockPrice)throw new Error('Không đủ vàng để mở đất.');return{player:{...state.player,gold:state.player.gold-plot.unlockPrice},plots:state.plots.map(p=>p.id===plotId?{...p,isUnlocked:true}:p),stats:{...state.stats,plotsUnlocked:state.stats.plotsUnlocked+1},lastSavedAt:new Date().toISOString()}}),
  buyItem:(type,referenceId,quantity=1)=>set(state=>{const def=type==='seed'?cropById(referenceId):fertilizerById(referenceId);if(!def)throw new Error('Không tìm thấy vật phẩm.');const req='requiredLevel'in def?def.requiredLevel:1;if(state.player.level<req)throw new Error(`Cần đạt cấp ${req}.`);const gold=('seedPrice'in def?def.seedPrice:def.priceGold??0)*quantity,diamonds=('priceDiamonds'in def?def.priceDiamonds??0:0)*quantity;if(state.player.gold<gold||state.player.diamonds<diamonds)throw new Error('Không đủ tiền.');if(totalItems(state.inventory)+quantity>state.player.inventoryCapacity)throw new Error('Kho đã đầy.');return{player:{...state.player,gold:state.player.gold-gold,diamonds:state.player.diamonds-diamonds},inventory:changeItem(state.inventory,type,referenceId,quantity),lastSavedAt:new Date().toISOString()}}),
  sellProduce:(cropId,quantity)=>{let earned=0;set(state=>{const crop=cropById(cropId);if(!crop||quantity<=0)throw new Error('Số lượng không hợp lệ.');if(quantityOf(state.inventory,'produce',cropId)<quantity)throw new Error('Không đủ nông sản.');earned=crop.sellPrice*quantity;return{player:{...state.player,gold:state.player.gold+earned},inventory:changeItem(state.inventory,'produce',cropId,-quantity),stats:{...state.stats,sold:state.stats.sold+quantity},lastSavedAt:new Date().toISOString()}});return earned},
  updateSettings:settings=>set(state=>({player:{...state.player,settings:{...state.player.settings,...settings}}})), setTutorialStep:tutorialStep=>set({tutorialStep}), markLogin:()=>set(state=>({player:{...state.player,lastLoginAt:new Date().toISOString()}})),
  devAddGold:()=>set(s=>({player:{...s.player,gold:s.player.gold+10000}})),devAddDiamonds:()=>set(s=>({player:{...s.player,diamonds:s.player.diamonds+100}})),devLevelUp:()=>set(s=>({player:{...s.player,level:s.player.level+1,currentXp:0}})),devFinishCrops:()=>set(s=>({plots:s.plots.map(p=>p.cropInstance?{...p,cropInstance:{...p.cropInstance,readyAt:new Date(Date.now()+s.timeOffsetMs).toISOString()}}:p)})),devUnlockAll:()=>set(s=>({plots:s.plots.map(p=>({...p,isUnlocked:true}))})),devSkipTime:seconds=>set(s=>({timeOffsetMs:s.timeOffsetMs+seconds*1000})),
  resetGame:()=>set({version:1,player:initialPlayer(),plots:initialPlots(),inventory:initialInventory,stats:initialStats(),lastSavedAt:new Date().toISOString(),tutorialStep:0,timeOffsetMs:0}),
}),{name:'happy-farm-save-v1',version:1,migrate:persisted=>persisted as GameStore}))

export const getGameSnapshot = ():GameStateData => {
  const {version,player,plots,inventory,stats,lastSavedAt,tutorialStep}=useGameStore.getState()
  return {version,player,plots,inventory,stats,lastSavedAt,tutorialStep}
}

export { crops }
