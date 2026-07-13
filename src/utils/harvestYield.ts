import type { CropDefinition, CropCareState, WeatherId } from '../types/game'
import { createRandomGenerator, randomChance, randomInteger } from './random'

export interface HarvestYieldResult { baseQuantity:number; randomAdjustment:number; careBonus:number; weatherBonus:number; itemBonus:number; luckyBonus:number; perfectHarvestBonus:number; finalQuantity:number; isLuckyHarvest:boolean; isPerfectHarvest:boolean }
export interface HarvestYieldInput { crop:CropDefinition; careState?:CropCareState; weather?:WeatherId; activeBoosts?:number; luckyChanceBonus?:number; randomSeed?:number }

export const calculateHarvestYield = ({crop,careState,weather='cloudy',activeBoosts=0,luckyChanceBonus=0,randomSeed=Date.now()}:HarvestYieldInput):HarvestYieldResult => {
 const random=createRandomGenerator(randomSeed), min=crop.minHarvestQuantity, normalMax=crop.maxHarvestQuantity
 const adjusted=randomInteger(min,normalMax,random), randomAdjustment=adjusted-crop.baseHarvestQuantity
 const careScore=careState ? Math.max(0,Math.min(1,(careState.water+(careState.weeds?0:100)+(careState.pests?0:100))/300)) : .5
 const careBonus=Math.floor(adjusted*(crop.careYieldBonusPercent??0)/100*careScore)
 const weatherPercent=weather==='rainbow'?15:weather==='sunny'?5:weather==='rain'?4:0
 const weatherBonus=Math.floor(adjusted*weatherPercent/100),itemBonus=Math.max(0,Math.floor(activeBoosts))
 const isLuckyHarvest=randomChance(crop.bonusYieldChance+(weather==='rainbow'?.08:0)+luckyChanceBonus/100,random)
 const luckyBonus=isLuckyHarvest?randomInteger(1,crop.maxBonusYield,random):0
 const beforePerfect=adjusted+careBonus+weatherBonus+itemBonus+luckyBonus
 const isPerfectHarvest=randomChance(crop.perfectHarvestChance??0,random)
 const perfectHarvestBonus=isPerfectHarvest?Math.max(1,Math.floor(beforePerfect*((crop.perfectHarvestMultiplier??1)-1))):0
 const hardMax=normalMax+crop.maxBonusYield+Math.max(careBonus+weatherBonus+itemBonus,perfectHarvestBonus)
 const finalQuantity=Math.max(min,Math.min(hardMax,Math.round(beforePerfect+perfectHarvestBonus)))
 return {baseQuantity:crop.baseHarvestQuantity,randomAdjustment,careBonus,weatherBonus,itemBonus,luckyBonus,perfectHarvestBonus,finalQuantity,isLuckyHarvest,isPerfectHarvest}
}
