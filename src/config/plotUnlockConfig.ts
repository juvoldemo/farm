export interface PlotUnlockConfig { plotNumber: number; price: number; requiredLevel: number }

const prices = [0,0,0,500,800,1200,1800,2500,3500,5000,7000,10000,14000,19000,25000,32000,40000,50000,65000,80000,100000,130000,170000,220000]
const requiredLevel = (plot: number) => plot <= 6 ? 1 : plot <= 9 ? 3 : plot <= 12 ? 5 : plot <= 16 ? 8 : plot <= 20 ? 12 : 18
export const plotUnlockConfig: PlotUnlockConfig[] = prices.map((price, index) => ({ plotNumber: index + 1, price, requiredLevel: requiredLevel(index + 1) }))
