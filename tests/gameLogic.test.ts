import { beforeEach, describe, expect, it } from 'vitest'
import { crops } from '../src/config/crops'
import { fertilizers } from '../src/config/fertilizers'
import type { CropInstance } from '../src/types/game'
import { applyFertilizer, getCropCurrentStage, getCropGrowthPercent, getCropGrowthState, getCropRemainingTime } from '../src/utils/cropGrowth'
import { calculatePlayerLevel } from '../src/utils/level'
import { syncOfflineProgress } from '../src/services/storageService'
import { getGameSnapshot, useGameStore } from '../src/store/gameStore'
import { calculateHarvestYield } from '../src/utils/harvestYield'
import { migrateSaveGame, validateSaveGame } from '../src/services/saveMigrationService'
import { normalizeCloudState } from '../src/services/cloudSaveService'
import { getCropEconomy, simulateCropIncome, validateCropEconomy } from '../src/utils/cropEconomy'

const cabbage=crops[0]
const instance=(planted:number,ready:number):CropInstance=>({id:'c1',cropId:cabbage.id,plotId:'plot-1',plantedAt:new Date(planted).toISOString(),readyAt:new Date(ready).toISOString(),baseGrowthDuration:60,totalReductionSeconds:0,fertilizerUsage:[],lastCalculatedAt:new Date(planted).toISOString()})

describe('cấu hình thời gian sinh trưởng',()=>{
 it('mọi cây lớn hơn 3 giờ và tăng mượt theo thời gian thực',()=>{
   expect(crops.every(crop=>crop.growthDurationSeconds>3*3600)).toBe(true)
   expect(crops[0].growthDurationSeconds).toBe(3*3600+15*60)
   expect(crops.every((crop,index)=>index===0||crop.growthDurationSeconds>=crops[index-1].growthDurationSeconds)).toBe(true)
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
 it('không mở đất khi thiếu vàng',()=>{useGameStore.setState(s=>({player:{...s.player,level:2,gold:0}}));expect(()=>useGameStore.getState().unlockPlot('plot-4')).toThrow(/Không đủ vàng/)})
 it('không mua hạt khi thiếu vàng',()=>{useGameStore.setState(s=>({player:{...s.player,level:3,gold:0}}));expect(()=>useGameStore.getState().buyItem('seed','corn')).toThrow(/Không đủ vàng/)})
 it('không thu hoạch cây chưa chín',()=>{useGameStore.getState().plantCrop('plot-1','cabbage');expect(()=>useGameStore.getState().harvestCrop('plot-1')).toThrow(/chưa chín/)})
 it('thu hoạch cộng kho và XP trong phạm vi cấu hình',()=>{useGameStore.getState().plantCrop('plot-1','cabbage');useGameStore.getState().devFinishCrops();const reward=useGameStore.getState().harvestCrop('plot-1');expect(reward.quantity).toBeGreaterThanOrEqual(cabbage.minHarvestQuantity);expect(reward.quantity).toBeLessThanOrEqual(cabbage.maxHarvestQuantity+cabbage.maxBonusYield+5);expect(useGameStore.getState().player.currentXp).toBe(4);expect(useGameStore.getState().inventory.find(i=>i.itemType==='produce'&&i.referenceId==='cabbage')?.quantity).toBe(reward.quantity);expect(useGameStore.getState().harvestHistory).toHaveLength(1)})
 it('cộng XP có thể lên nhiều cấp',()=>{const value=calculatePlayerLevel(1,90,200);expect(value.level).toBe(3);expect(value.currentXp).toBe(30);expect(value.levelsGained).toBe(2)})
 it('đồng bộ offline chỉ báo cây chín, không tự thu hoạch',()=>{const state=useGameStore.getState();const planted=instance(Date.now()-120_000,Date.now()-60_000);const snapshot={...state,plots:state.plots.map((p,i)=>i===0?{...p,cropInstance:planted}:p),player:{...state.player,lastLoginAt:new Date(Date.now()-120_000).toISOString()}};const result=syncOfflineProgress(snapshot);expect(result.elapsedSeconds).toBeGreaterThanOrEqual(119);expect(result.readyCrops).toBe(1);expect(snapshot.plots[0].cropInstance).toBeDefined()})
 it('tạo snapshot cloud chỉ gồm dữ liệu game cần thiết',()=>{const snapshot=getGameSnapshot();expect(snapshot.plots).toHaveLength(24);expect(snapshot).not.toHaveProperty('plantCrop');expect(snapshot).not.toHaveProperty('timeOffsetMs')})
 it('khôi phục đầy đủ snapshot tải từ cloud',()=>{const snapshot=getGameSnapshot();const cloud={...snapshot,player:{...snapshot.player,gold:4321},tutorialStep:7};useGameStore.getState().replaceGameData(cloud);expect(useGameStore.getState().player.gold).toBe(4321);expect(useGameStore.getState().tutorialStep).toBe(7);expect(useGameStore.getState().plots).toHaveLength(24)})
 it('không để response thu hoạch cũ ghi đè metadata mới hơn',()=>{const snapshot=getGameSnapshot(),newer={...snapshot,lastSavedAt:'2096-07-15T02:00:00.000Z',stats:{...snapshot.stats,harvested:22}},older={...snapshot,lastSavedAt:'2096-07-15T01:00:00.000Z',stats:{...snapshot.stats,harvested:11}};useGameStore.getState().applyServerHarvestState(newer,'plot-1','cabbage');useGameStore.getState().applyServerHarvestState(older,'plot-2','carrot');expect(useGameStore.getState().stats.harvested).toBe(22)})
 it('cloud chấp nhận save hiện tại và migrate save cũ',()=>{const current=getGameSnapshot(),legacy={...current,version:1,currentWeather:undefined,player:{...current.player,diamonds:5}};expect(normalizeCloudState(current).version).toBe(6);const migrated=normalizeCloudState(legacy);expect(migrated.version).toBe(6);expect(migrated.player).not.toHaveProperty('diamonds')})
})

describe('sản lượng có seed',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
 it('cùng seed cho kết quả giống nhau và luôn là số nguyên',()=>{const input={crop:cabbage,careState:{water:100,weeds:false,pests:false},weather:'rainbow' as const,randomSeed:12345};const a=calculateHarvestYield(input),b=calculateHarvestYield(input);expect(a).toEqual(b);expect(Number.isInteger(a.finalQuantity)).toBe(true);expect(a.finalQuantity).toBeGreaterThanOrEqual(cabbage.minHarvestQuantity)})
 it('care tốt không làm giảm sản lượng',()=>{const good=calculateHarvestYield({crop:cabbage,careState:{water:100,weeds:false,pests:false},randomSeed:44}),bad=calculateHarvestYield({crop:cabbage,careState:{water:0,weeds:true,pests:true},randomSeed:44});expect(good.careBonus).toBeGreaterThanOrEqual(bad.careBonus)})
 it('không thể thu hoạch cùng một cây hai lần',()=>{useGameStore.getState().plantCrop('plot-1','cabbage');useGameStore.getState().devFinishCrops();useGameStore.getState().harvestCrop('plot-1');expect(()=>useGameStore.getState().harvestCrop('plot-1')).toThrow(/Không có cây/)})
})

describe('giá trị kinh tế cây trồng',()=>{
 it('tính đúng doanh thu, lợi nhuận và lãi theo giờ',()=>{const value=getCropEconomy(cabbage);expect(value.seedCost).toBe(150);expect(value.minRevenue).toBe(330);expect(value.baseRevenue).toBe(440);expect(value.maxNormalRevenue).toBe(550);expect(value.averageProfit).toBeCloseTo(347.75);expect(value.profitPerHour).toBeCloseTo(107)})
 it('validator không phát hiện cây lỗi và lãi/giờ tăng có kiểm soát',()=>{expect(validateCropEconomy(crops)).toEqual([]);const pph=crops.map(c=>getCropEconomy(c).profitPerHour);expect(pph.every((v,i)=>i===0||(v/pph[i-1]-1)<=.15)).toBe(true)})
 it.each([3,6,12,18,24])('mô phỏng %i ô không tạo số âm/NaN',(plots)=>{const result=simulateCropIncome(cabbage,plots,30);expect(result.profit).toBeGreaterThan(0);expect(Number.isFinite(result.profit)).toBe(true)})
 it('thu nhập tăng tuyến tính theo số ô, không có hệ số lạm phát ẩn',()=>{const one=simulateCropIncome(cabbage,3).profit,full=simulateCropIncome(cabbage,24).profit;expect(full/one).toBeCloseTo(8)})
})

describe('migrate và giao dịch đơn hàng',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
it('nâng save v1 mà không mất vàng, cây và kho',()=>{const current=getGameSnapshot(),old={...current,version:1,orders:undefined,currentWeather:undefined,randomEventState:undefined,harvestHistory:undefined,player:{...current.player,gold:987,settings:{music:true,sound:true,reducedMotion:false}}};const migrated=migrateSaveGame(old);expect(migrated.version).toBe(6);expect(migrated.player.gold).toBe(987);expect(migrated.plots).toHaveLength(24);expect(migrated.inventory).toEqual(current.inventory);expect(migrated.player.settings.haptics).toBe(true);expect(migrated.player.settings.graphicsQuality).toBe('medium');expect(validateSaveGame(migrated)).toBe(true)})
 it('giữ cây cũ không phải chờ lâu hơn khi migrate',()=>{const current=getGameSnapshot(),readyAt=new Date(Date.now()+60_000).toISOString(),old={...current,version:5,plots:current.plots.map((p,i)=>i? p:{...p,cropInstance:{...instance(Date.now()-60_000,Date.now()+60_000),readyAt}})};const migrated=migrateSaveGame(old);expect(new Date(migrated.plots[0].cropInstance!.readyAt).getTime()).toBeLessThanOrEqual(new Date(readyAt).getTime());expect(migrated.plots[0].cropInstance!.cropId).toBe(cabbage.id)})
 it('backfill field cây cũ còn thiếu mà không đổi timestamp',()=>{const current=getGameSnapshot(),legacy=instance(Date.now()-10_000,Date.now()+50_000),readyAt=legacy.readyAt,{fertilizerUsage:_,totalReductionSeconds:__,lastCalculatedAt:___,...missingFields}=legacy;void _;void __;void ___;const old={...current,plots:current.plots.map((plot,index)=>index?plot:{...plot,cropInstance:missingFields})};const migrated=migrateSaveGame(old),crop=migrated.plots[0].cropInstance!;expect(crop.fertilizerUsage).toEqual([]);expect(crop.totalReductionSeconds).toBe(0);expect(crop.readyAt).toBe(readyAt)})
 it('thiếu nông sản không trừ kho hay cộng thưởng',()=>{useGameStore.getState().ensureOrders();const before=getGameSnapshot(),order=before.orders[0];expect(()=>useGameStore.getState().deliverOrder(order.id)).toThrow(/Chưa đủ/);const after=getGameSnapshot();expect(after.inventory).toEqual(before.inventory);expect(after.player.gold).toBe(before.player.gold)})
})
