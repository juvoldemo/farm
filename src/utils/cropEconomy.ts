import type { CropDefinition } from '../types/game'

export interface CropEconomy {
  seedCost:number; sellPricePerItem:number; averageBaseYield:number; averageBonusYield:number; averageYield:number
  baseRevenue:number; minRevenue:number; maxNormalRevenue:number; averageRevenue:number
  baseProfit:number; minProfit:number; maxNormalProfit:number; averageProfit:number; profitPerHour:number
  seedCostRatio:number; roi:number; breakEvenQuantity:number
}

export const getCropEconomy=(crop:CropDefinition):CropEconomy=>{
 const averageBaseYield=(crop.minHarvestQuantity+crop.maxHarvestQuantity)/2
 const averageBonusYield=crop.bonusYieldChance*(crop.bonusYieldMin+crop.bonusYieldMax)/2
 const averageYield=averageBaseYield+averageBonusYield
 const averageRevenue=averageYield*crop.sellPrice,averageProfit=averageRevenue-crop.seedPrice
 return {seedCost:crop.seedPrice,sellPricePerItem:crop.sellPrice,averageBaseYield,averageBonusYield,averageYield,
  baseRevenue:crop.baseHarvestQuantity*crop.sellPrice,minRevenue:crop.minHarvestQuantity*crop.sellPrice,maxNormalRevenue:crop.maxHarvestQuantity*crop.sellPrice,averageRevenue,
  baseProfit:crop.baseHarvestQuantity*crop.sellPrice-crop.seedPrice,minProfit:crop.minHarvestQuantity*crop.sellPrice-crop.seedPrice,maxNormalProfit:crop.maxHarvestQuantity*crop.sellPrice-crop.seedPrice,averageProfit,
  profitPerHour:averageProfit/(crop.growthDurationSeconds/3600),seedCostRatio:crop.seedPrice/averageRevenue,roi:averageProfit/crop.seedPrice,breakEvenQuantity:Math.ceil(crop.seedPrice/crop.sellPrice)}
}

export interface EconomyWarning {cropId:string;severity:'error'|'warning';message:string}
export const validateCropEconomy=(crops:CropDefinition[]):EconomyWarning[]=>{
 const warnings:EconomyWarning[]=[]
 crops.forEach((crop,index)=>{const value=getCropEconomy(crop),previous=index?getCropEconomy(crops[index-1]):undefined
  const add=(severity:EconomyWarning['severity'],message:string)=>warnings.push({cropId:crop.id,severity,message})
  if(crop.growthDurationSeconds<=10800)add('error','Thời gian sinh trưởng không lớn hơn 3 giờ')
  if(crop.sellPrice<=0||value.averageProfit<=0)add('error','Giá bán hoặc lợi nhuận không hợp lệ')
  if(crop.minHarvestQuantity>crop.maxHarvestQuantity||crop.bonusYieldMin>crop.bonusYieldMax)add('error','Khoảng sản lượng bị đảo')
  if(!Number.isFinite(value.profitPerHour))add('error','Chỉ số kinh tế không hữu hạn')
  if(value.seedCostRatio<.25||value.seedCostRatio>.45)add('warning','Tỷ lệ giá hạt ngoài khoảng 25–45%')
  if(previous){const change=value.profitPerHour/previous.profitPerHour-1;if(change>.15)add('warning',`Lãi/giờ tăng ${(change*100).toFixed(1)}%`);if(change<-.10)add('warning',`Lãi/giờ giảm ${(-change*100).toFixed(1)}%`)}
 })
 return warnings
}

export const simulateCropIncome=(crop:CropDefinition,plots:number,days=1)=>{const value=getCropEconomy(crop),cyclesPerDay=86400/crop.growthDurationSeconds;return{plots,days,seedCost:crop.seedPrice*plots,revenuePerCycle:value.averageRevenue*plots,profitPerCycle:value.averageProfit*plots,profit:value.averageProfit*plots*cyclesPerDay*days}}
