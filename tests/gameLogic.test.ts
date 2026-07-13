import { beforeEach, describe, expect, it } from 'vitest'
import { crops, GROWTH_TIME_MULTIPLIER } from '../src/config/crops'
import { fertilizers } from '../src/config/fertilizers'
import type { CropInstance } from '../src/types/game'
import { applyFertilizer, getCropCurrentStage, getCropGrowthPercent, getCropGrowthState, getCropRemainingTime } from '../src/utils/cropGrowth'
import { calculatePlayerLevel } from '../src/utils/level'
import { syncOfflineProgress } from '../src/services/storageService'
import { getGameSnapshot, useGameStore } from '../src/store/gameStore'
import { calculateHarvestYield } from '../src/utils/harvestYield'
import { migrateSaveGame, validateSaveGame } from '../src/services/saveMigrationService'

const cabbage=crops[0]
const instance=(planted:number,ready:number):CropInstance=>({id:'c1',cropId:cabbage.id,plotId:'plot-1',plantedAt:new Date(planted).toISOString(),readyAt:new Date(ready).toISOString(),baseGrowthDuration:60,totalReductionSeconds:0,fertilizerUsage:[],lastCalculatedAt:new Date(planted).toISOString()})

describe('cấu hình thời gian sinh trưởng',()=>{
 it('áp dụng hệ số 20 lần cho tất cả cây',()=>{
   expect(GROWTH_TIME_MULTIPLIER).toBe(20)
   expect(crops.map(crop=>crop.growthDurationSeconds)).toEqual([60,180,600,1800,2700,3600,10800,18000,28800,43200,64800,86400].map(seconds=>seconds*20))
 })
})

describe('logic thời gian cây trồng',()=>{
 it('tính đúng phần trăm và không vượt biên',()=>{const crop=instance(0,100_000);expect(getCropGrowthPercent(crop,50_000)).toBe(50);expect(getCropGrowthPercent(crop,200_000)).toBe(100);expect(getCropGrowthPercent(crop,-1)).toBe(0)})
 it('chọn đúng 5 giai đoạn',()=>{expect(getCropCurrentStage(cabbage,0).key).toBe('seed');expect(getCropCurrentStage(cabbage,20).key).toBe('sprout');expect(getCropCurrentStage(cabbage,50).key).toBe('young');expect(getCropCurrentStage(cabbage,75).key).toBe('mature');expect(getCropCurrentStage(cabbage,95).key).toBe('fruit')})
 it('tính thời gian còn lại và trạng thái chín',()=>{const crop=instance(0,60_000);expect(getCropRemainingTime(crop,20_000)).toBe(40);expect(getCropGrowthState(crop,cabbage,60_001).isReadyToHarvest).toBe(true)})
 it('phân thường giảm thời gian nhưng luôn chừa 10 giây',()=>{const crop=instance(0,60_000),result=applyFertilizer(crop,fertilizers[0],0);expect(result.reductionSeconds).toBe(50);expect(getCropRemainingTime(result.instance,0)).toBe(10)})
 it('phân phần trăm giảm theo thời gian còn lại',()=>{const crop=instance(0,100_000),result=applyFertilizer(crop,fertilizers[3],20_000);expect(result.reductionSeconds).toBe(20);expect(getCropRemainingTime(result.instance,20_000)).toBe(60)})
 it('không cho bón cây đã chín',()=>expect(()=>applyFertilizer(instance(0,10_000),fertilizers[0],11_000)).toThrow(/đã chín/))
})

describe('giao dịch và tiến trình',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
 it('không mở đất khi thiếu vàng',()=>expect(()=>useGameStore.getState().unlockPlot('plot-4')).toThrow(/Không đủ vàng/))
 it('không mua hạt khi thiếu vàng',()=>{useGameStore.setState(s=>({player:{...s.player,level:3,gold:0}}));expect(()=>useGameStore.getState().buyItem('seed','corn')).toThrow(/Không đủ tiền/)})
 it('không thu hoạch cây chưa chín',()=>{useGameStore.getState().plantCrop('plot-1','cabbage');expect(()=>useGameStore.getState().harvestCrop('plot-1')).toThrow(/chưa chín/)})
 it('thu hoạch cộng kho và XP trong phạm vi cấu hình',()=>{useGameStore.getState().plantCrop('plot-1','cabbage');useGameStore.getState().devFinishCrops();const reward=useGameStore.getState().harvestCrop('plot-1');expect(reward.quantity).toBeGreaterThanOrEqual(cabbage.minHarvestQuantity);expect(reward.quantity).toBeLessThanOrEqual(cabbage.maxHarvestQuantity+cabbage.maxBonusYield+5);expect(useGameStore.getState().player.currentXp).toBe(4);expect(useGameStore.getState().inventory.find(i=>i.itemType==='produce'&&i.referenceId==='cabbage')?.quantity).toBe(reward.quantity);expect(useGameStore.getState().harvestHistory).toHaveLength(1)})
 it('cộng XP có thể lên nhiều cấp',()=>{const value=calculatePlayerLevel(1,90,200);expect(value.level).toBe(3);expect(value.currentXp).toBe(30);expect(value.levelsGained).toBe(2)})
 it('đồng bộ offline chỉ báo cây chín, không tự thu hoạch',()=>{const state=useGameStore.getState();const planted=instance(Date.now()-120_000,Date.now()-60_000);const snapshot={...state,plots:state.plots.map((p,i)=>i===0?{...p,cropInstance:planted}:p),player:{...state.player,lastLoginAt:new Date(Date.now()-120_000).toISOString()}};const result=syncOfflineProgress(snapshot);expect(result.elapsedSeconds).toBeGreaterThanOrEqual(119);expect(result.readyCrops).toBe(1);expect(snapshot.plots[0].cropInstance).toBeDefined()})
 it('tạo snapshot cloud chỉ gồm dữ liệu game cần thiết',()=>{const snapshot=getGameSnapshot();expect(snapshot.plots).toHaveLength(24);expect(snapshot).not.toHaveProperty('plantCrop');expect(snapshot).not.toHaveProperty('timeOffsetMs')})
 it('khôi phục đầy đủ snapshot tải từ cloud',()=>{const snapshot=getGameSnapshot();const cloud={...snapshot,player:{...snapshot.player,gold:4321},tutorialStep:7};useGameStore.getState().replaceGameData(cloud);expect(useGameStore.getState().player.gold).toBe(4321);expect(useGameStore.getState().tutorialStep).toBe(7);expect(useGameStore.getState().plots).toHaveLength(24)})
})

describe('sản lượng có seed',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
 it('cùng seed cho kết quả giống nhau và luôn là số nguyên',()=>{const input={crop:cabbage,careState:{water:100,weeds:false,pests:false},weather:'rainbow' as const,randomSeed:12345};const a=calculateHarvestYield(input),b=calculateHarvestYield(input);expect(a).toEqual(b);expect(Number.isInteger(a.finalQuantity)).toBe(true);expect(a.finalQuantity).toBeGreaterThanOrEqual(cabbage.minHarvestQuantity)})
 it('care tốt không làm giảm sản lượng',()=>{const good=calculateHarvestYield({crop:cabbage,careState:{water:100,weeds:false,pests:false},randomSeed:44}),bad=calculateHarvestYield({crop:cabbage,careState:{water:0,weeds:true,pests:true},randomSeed:44});expect(good.careBonus).toBeGreaterThanOrEqual(bad.careBonus)})
 it('không thể thu hoạch cùng một cây hai lần',()=>{useGameStore.getState().plantCrop('plot-1','cabbage');useGameStore.getState().devFinishCrops();useGameStore.getState().harvestCrop('plot-1');expect(()=>useGameStore.getState().harvestCrop('plot-1')).toThrow(/Không có cây/)})
})

describe('migrate và giao dịch đơn hàng',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
 it('nâng save v1 mà không mất vàng, cây và kho',()=>{const current=getGameSnapshot(),old={...current,version:1,orders:undefined,currentWeather:undefined,randomEventState:undefined,harvestHistory:undefined,player:{...current.player,gold:987,settings:{music:true,sound:true,reducedMotion:false}}};const migrated=migrateSaveGame(old);expect(migrated.version).toBe(3);expect(migrated.player.gold).toBe(987);expect(migrated.plots).toHaveLength(24);expect(migrated.inventory).toEqual(current.inventory);expect(migrated.player.settings.haptics).toBe(true);expect(validateSaveGame(migrated)).toBe(true)})
 it('thiếu nông sản không trừ kho hay cộng thưởng',()=>{useGameStore.getState().ensureOrders();const before=getGameSnapshot(),order=before.orders[0];expect(()=>useGameStore.getState().deliverOrder(order.id)).toThrow(/Chưa đủ/);const after=getGameSnapshot();expect(after.inventory).toEqual(before.inventory);expect(after.player.gold).toBe(before.player.gold)})
})
