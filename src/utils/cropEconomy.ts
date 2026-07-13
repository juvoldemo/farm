import type { CropDefinition } from '../types/game'

export interface CropEconomy {
  seedCost:number
  sellPricePerItem:number
  baseRevenue:number
  minRevenue:number
  maxNormalRevenue:number
  baseProfit:number
  minProfit:number
  maxNormalProfit:number
  breakEvenQuantity:number
}

export const getCropEconomy=(crop:CropDefinition):CropEconomy=>({
  seedCost:crop.seedPrice,
  sellPricePerItem:crop.sellPrice,
  baseRevenue:crop.baseHarvestQuantity*crop.sellPrice,
  minRevenue:crop.minHarvestQuantity*crop.sellPrice,
  maxNormalRevenue:crop.maxHarvestQuantity*crop.sellPrice,
  baseProfit:crop.baseHarvestQuantity*crop.sellPrice-crop.seedPrice,
  minProfit:crop.minHarvestQuantity*crop.sellPrice-crop.seedPrice,
  maxNormalProfit:crop.maxHarvestQuantity*crop.sellPrice-crop.seedPrice,
  breakEvenQuantity:Math.ceil(crop.seedPrice/crop.sellPrice),
})
