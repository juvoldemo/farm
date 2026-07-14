import { findHybridRecipe } from '../config/hybridRecipes'
import { geneticsLimits, hybridConfig, inheritanceConfig, traitDefinitions, traitValue } from '../config/geneticsConfig'
import type { CropTrait, FarmPlot, SeedRarity, TraitId } from '../types/game'

export const getTrait=(traits:CropTrait[]|undefined,id:TraitId)=>traits?.find(t=>t.traitId===id)
export const calculateGeneticGrowthDuration=(baseSeconds:number,traits:CropTrait[]|undefined,otherReduction=0,minSeconds=1)=>{
 const fast=getTrait(traits,'fast_growth'),traitReduction=fast?traitValue(fast.traitId,fast.level):0
 return Math.max(minSeconds,Math.round(baseSeconds*Math.max(geneticsLimits.minGrowthFactor,1-traitReduction-otherReduction)))
}
export const applyGeneticYield=(base:number,traits:CropTrait[]|undefined,rainExperienced:boolean)=>{
 const high=getTrait(traits,'high_yield'),rain=getTrait(traits,'rain_loving')
 const bonus=Math.min(geneticsLimits.maxYieldBonus,(high?traitValue(high.traitId,high.level):0)+(rain&&rainExperienced?traitValue(rain.traitId,rain.level):0))
 return Math.max(1,Math.round(base*(1+bonus)))
}
export const adjacentPlotNumbers=(plotNumber:number,columns=6,total=24)=>{
 const index=plotNumber-1,row=Math.floor(index/columns),column=index%columns,result:number[]=[]
 if(row>0)result.push(plotNumber-columns);if(row<Math.ceil(total/columns)-1&&plotNumber+columns<=total)result.push(plotNumber+columns)
 if(column>0)result.push(plotNumber-1);if(column<columns-1&&plotNumber<total)result.push(plotNumber+1)
 return result
}
export const eligibleHybridNeighbors=(plot:FarmPlot,plots:FarmPlot[],now:number)=>new Set(adjacentPlotNumbers(plot.plotNumber)).size?plots.filter(other=>adjacentPlotNumbers(plot.plotNumber).includes(other.plotNumber)&&!!other.cropInstance&&new Date(other.cropInstance.readyAt).getTime()<=now&&!!plot.cropInstance&&(!!findHybridRecipe(plot.cropInstance.cropId,other.cropInstance.cropId)||plot.cropInstance.cropId===other.cropInstance.cropId)):[]
export const calculateHybridChance=(base:number,a:CropTrait[]|undefined,b:CropTrait[]|undefined,wellCared=false)=>Math.min(hybridConfig.maxChance,base+(getTrait(a,'easy_hybrid')?traitValue('easy_hybrid',getTrait(a,'easy_hybrid')!.level):0)+(getTrait(b,'easy_hybrid')?traitValue('easy_hybrid',getTrait(b,'easy_hybrid')!.level):0)+(wellCared?hybridConfig.careBonus:0))

export const inheritTraits=(a:CropTrait[],b:CropTrait[],random:()=>number=Math.random,allowed?:TraitId[]):CropTrait[]=>{
 const ids=[...new Set([...a,...b].map(t=>t.traitId))].filter(id=>!allowed||allowed.includes(id)),result:CropTrait[]=[]
 for(const id of ids){const ta=getTrait(a,id),tb=getTrait(b,id),chance=ta&&tb?inheritanceConfig.bothParentsChance:inheritanceConfig.singleParentChance;if(random()>chance)continue;let level=Math.max(ta?.level??1,tb?.level??1) as 1|2|3;if(ta&&tb&&ta.level===tb.level&&level<3&&random()<inheritanceConfig.upgradeChance)level=(level+1) as 2|3;result.push({traitId:id,level,value:traitValue(id,level),discovered:true})}
 const mutationPool=(allowed??Object.keys(traitDefinitions) as TraitId[]).filter(id=>!result.some(item=>item.traitId===id))
 if(result.length<inheritanceConfig.maxInheritedTraits&&mutationPool.length&&random()<inheritanceConfig.mutationChance){const id=mutationPool[Math.floor(random()*mutationPool.length)];result.push({traitId:id,level:1,value:traitValue(id,1),discovered:true})}
 return result.sort((x,y)=>y.level-x.level).slice(0,inheritanceConfig.maxInheritedTraits)
}
export const nextRarity=(a:SeedRarity,b:SeedRarity):SeedRarity=>{const order:SeedRarity[]=['common','uncommon','rare','epic','legendary'];return order[Math.min(order.length-1,Math.max(order.indexOf(a),order.indexOf(b))+1)]}
