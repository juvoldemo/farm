import type { GameStateData, PlayerSettings } from '../types/game'
import { npcs } from '../config/npcs'
import { getNpcStateAtTime } from './npcScheduleService'
import { createRelationship } from './npcRelationshipService'
import { createNpcShopState } from './npcShopService'
import { createNpcFarmState } from './npcFarmService'

export const SAVE_VERSION=5
const dayKey=()=>new Date().toISOString().slice(0,10)
const defaultWeather=()=>({id:'sunny' as const,startedAt:new Date().toISOString(),endsAt:new Date(Date.now()+20*60_000).toISOString(),seed:Date.now()})
export const migrateSaveGame=(input:unknown):GameStateData=>{
 if(!input||typeof input!=='object')throw new Error('Bản lưu không hợp lệ.')
 const old=input as Partial<GameStateData>
 if(!old.player||!Array.isArray(old.plots)||!Array.isArray(old.inventory)||!old.stats)throw new Error('Bản lưu thiếu dữ liệu cốt lõi.')
 const saved=old.player.settings as Partial<PlayerSettings>
 const settings:PlayerSettings={music:saved.music??true,sound:saved.sound??true,reducedMotion:saved.reducedMotion??false,haptics:saved.haptics??true,volume:saved.volume??.55}
 const player={...old.player} as typeof old.player&{diamonds?:number}
 delete player.diamonds
 const weather=old.currentWeather??defaultWeather(),now=Date.now()
 const npcStates=old.npcStates??Object.fromEntries(npcs.map(npc=>[npc.id,getNpcStateAtTime(npc.id,now,weather.id)])),npcRelationships=old.npcRelationships??Object.fromEntries(npcs.map(npc=>[npc.id,createRelationship(npc.id)])),npcShopStates=Object.fromEntries(npcs.filter(npc=>npc.shopId).map(npc=>{const saved=old.npcShopStates?.[npc.shopId!];return[npc.shopId!,saved?{...saved,purchased:saved.purchased??{}}:createNpcShopState(npc.shopId!,now)]})),dialogueProgress=old.dialogueProgress??Object.fromEntries(npcs.map(npc=>[npc.id,{npcId:npc.id,met:false}]))
 const orders=(old.orders??[]).map(order=>{const clean={...order} as typeof order&{rewardDiamonds?:number};delete clean.rewardDiamonds;return clean})
 return {...old,version:SAVE_VERSION,player:{...player,settings},plots:old.plots.map(plot=>plot.cropInstance?{...plot,cropInstance:{...plot.cropInstance,rarity:plot.cropInstance.rarity??'common',traits:plot.cropInstance.traits??[],generation:plot.cropInstance.generation??0,calculatedGrowthDuration:plot.cropInstance.calculatedGrowthDuration??plot.cropInstance.baseGrowthDuration,weatherEffects:plot.cropInstance.weatherEffects??{rainExperienced:false},care:plot.cropInstance.care??{water:50,weeds:false,pests:false}}}:plot),specialSeeds:old.specialSeeds??[],hybridDiscoveries:old.hybridDiscoveries??[],orders,currentWeather:weather,randomEventState:old.randomEventState??{claimedToday:0,dayKey:dayKey()},harvestHistory:old.harvestHistory??[],npcStates,npcRelationships,npcShopStates,npcFarmStates:old.npcFarmStates??{ba:createNpcFarmState(now)},dialogueProgress,activeFoodBuffs:old.activeFoodBuffs??[],lastNpcSyncAt:old.lastNpcSyncAt??new Date(now).toISOString(),tutorialStep:old.tutorialStep??0,lastSavedAt:old.lastSavedAt??new Date().toISOString()} as GameStateData
}
export const validateSaveGame=(input:unknown)=>{try{const value=migrateSaveGame(input);return value.plots.length===24&&value.player.gold>=0&&value.inventory.every(i=>i.quantity>=0)}catch{return false}}
export const backupSaveGame=(raw:string)=>{if(typeof localStorage!=='undefined')localStorage.setItem(`happy-farm-backup-${Date.now()}`,raw)}
