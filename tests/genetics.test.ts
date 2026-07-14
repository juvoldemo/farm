import { describe, expect, it } from 'vitest'
import { findHybridRecipe } from '../src/config/hybridRecipes'
import { adjacentPlotNumbers, applyGeneticYield, calculateGeneticGrowthDuration, calculateHybridChance, eligibleHybridNeighbors, inheritTraits } from '../src/services/cropGeneticsService'
import type { CropTrait, FarmPlot } from '../src/types/game'
import { getGameSnapshot, useGameStore } from '../src/store/gameStore'
import { migrateSaveGame } from '../src/services/saveMigrationService'

const trait=(traitId:CropTrait['traitId'],level:1|2|3):CropTrait=>({traitId,level,value:0,discovered:true})
const crop=(plotNumber:number,cropId='tomato',ready=true,traits:CropTrait[]=[]):FarmPlot=>({id:`plot-${plotNumber}`,plotNumber,isUnlocked:true,unlockPrice:0,requiredLevel:1,cropInstance:{id:`crop-${plotNumber}`,plotId:`plot-${plotNumber}`,cropId,plantedAt:'2026-01-01T00:00:00Z',readyAt:ready?'2026-01-01T00:01:00Z':'2099-01-01T00:00:00Z',baseGrowthDuration:100,calculatedGrowthDuration:100,totalReductionSeconds:0,fertilizerUsage:[],lastCalculatedAt:'2026-01-01T00:00:00Z',traits,rarity:'common',generation:0}})

describe('đặc tính cây',()=>{
 it('hạt không đặc tính giữ nguyên thời gian và sản lượng',()=>{expect(calculateGeneticGrowthDuration(100,[])).toBe(100);expect(applyGeneticYield(10,[],false)).toBe(10)})
 it('Lớn nhanh giảm đúng một lần và tôn trọng giới hạn',()=>{expect(calculateGeneticGrowthDuration(100,[trait('fast_growth',2)])).toBe(90);expect(calculateGeneticGrowthDuration(100,[trait('fast_growth',3)],.35,60)).toBe(60)})
 it('Sai quả và Ưa mưa tăng sản lượng có giới hạn',()=>{expect(applyGeneticYield(10,[trait('high_yield',3)],false)).toBe(12);expect(applyGeneticYield(10,[trait('high_yield',3),trait('rain_loving',3)],true)).toBe(14)})
 it('save version 5 thiếu genetics vẫn được tự sửa',()=>{useGameStore.getState().resetGame();const current=getGameSnapshot(),broken={...current,specialSeeds:undefined,hybridDiscoveries:undefined};const migrated=migrateSaveGame(broken);expect(migrated.specialSeeds).toEqual([]);expect(migrated.hybridDiscoveries).toEqual([])})
})

describe('liền kề và công thức lai',()=>{
 it('chỉ trả bốn hướng, không qua biên hàng',()=>{expect(adjacentPlotNumbers(1)).toEqual([7,2]);expect(adjacentPlotNumbers(6)).toEqual([12,5]);expect(adjacentPlotNumbers(8).sort((a,b)=>a-b)).toEqual([2,7,9,14])})
 it('không tính ô chéo và cây chưa chín',()=>{const center=crop(8),plots=[center,crop(9,'pepper'),crop(13,'pepper'),crop(14,'pepper',false)];expect(eligibleHybridNeighbors(center,plots,Date.parse('2026-02-01'))).toHaveLength(1);expect(eligibleHybridNeighbors(center,plots,Date.parse('2026-02-01'))[0].plotNumber).toBe(9)})
 it('công thức không phụ thuộc thứ tự cha mẹ',()=>{expect(findHybridRecipe('tomato','pepper')?.id).toBe('tomato-pepper');expect(findHybridRecipe('pepper','tomato')?.id).toBe('tomato-pepper')})
 it('tỷ lệ Dễ lai cộng từ hai cha mẹ nhưng bị giới hạn',()=>{expect(calculateHybridChance(.08,[trait('easy_hybrid',1)],[trait('easy_hybrid',2)])).toBeCloseTo(.23);expect(calculateHybridChance(.4,[trait('easy_hybrid',3)],[trait('easy_hybrid',3)],true)).toBe(.5)})
})

describe('di truyền',()=>{
 it('không tạo đặc tính trùng và không vượt quá cấp 3',()=>{const always=()=>0,result=inheritTraits([trait('high_yield',3),trait('fast_growth',2)],[trait('high_yield',3),trait('good_seed',1)],always);expect(new Set(result.map(t=>t.traitId)).size).toBe(result.length);expect(result.length).toBeLessThanOrEqual(3);expect(Math.max(...result.map(t=>t.level))).toBeLessThanOrEqual(3)})
 it('cùng đặc tính có thể nâng cấp nhưng không quá cấp 3',()=>{let calls=0;const random=()=>{calls++;return 0};const result=inheritTraits([trait('fast_growth',2)],[trait('fast_growth',2)],random);expect(calls).toBeGreaterThan(1);expect(result[0].level).toBe(3)})
 it('có thể lọc đặc tính theo công thức',()=>{const result=inheritTraits([trait('fast_growth',1),trait('high_yield',1)],[trait('good_seed',1)],()=>0,['high_yield']);expect(result.map(t=>t.traitId)).toEqual(['high_yield'])})
})
