import { plotBalance } from './economyConfig'
export interface PlotUnlockConfig { plotNumber: number; price: number; requiredLevel: number }
export const plotUnlockConfig: PlotUnlockConfig[] = plotBalance.map(([plotNumber,price,requiredLevel])=>({plotNumber,price,requiredLevel}))
