import type { CropDefinition, FarmPlot } from './game'

/** UI-facing aliases that remain structurally compatible with existing game data. */
export type FarmPlotData = FarmPlot
export type CropData = CropDefinition

export type CropVisualStage =
  | 'seed'
  | 'sprout'
  | 'young'
  | 'growing'
  | 'mature'
  | 'harvestable'

export type FarmPlotStatus =
  | 'loading'
  | 'sync-error'
  | 'locked'
  | 'empty'
  | 'planting'
  | 'growing'
  | 'harvestable'
  | 'harvesting'

export type FarmAction =
  | 'plant'
  | 'water'
  | 'fertilize'
  | 'harvest'
  | 'unlock'
  | 'inspect'

/** Compatible with the result currently returned by the harvest coordinator. */
export interface HarvestResult {
  quantity: number
  xp: number
  lucky: boolean
  gold?: number
  plotId?: FarmPlotData['id']
  cropId?: CropData['id']
}

export type GraphicsQuality = 'low' | 'medium' | 'high'
