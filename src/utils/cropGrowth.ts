import type { CropDefinition, CropInstance, FertilizerDefinition, GrowthState } from '../types/game'

export const getCropGrowthPercent = (instance: CropInstance, now = Date.now()): number => {
  const planted = new Date(instance.plantedAt).getTime()
  const ready = new Date(instance.readyAt).getTime()
  const duration = Math.max(1, ready - planted)
  return Math.max(0, Math.min(100, ((now - planted) / duration) * 100))
}
export const getCropRemainingTime = (instance: CropInstance, now = Date.now()): number =>
  Math.max(0, Math.ceil((new Date(instance.readyAt).getTime() - now) / 1000))
export const getCropRemainingSeconds = getCropRemainingTime
export const getCropCurrentStage = (crop: CropDefinition, percent: number) =>
  crop.growthStages.find(stage => percent >= stage.startPercent && percent < stage.endPercent) ?? crop.growthStages.at(-1)!
export const getCropGrowthState = (instance: CropInstance, crop: CropDefinition, now = Date.now()): GrowthState => {
  const growthPercent = getCropGrowthPercent(instance, now)
  const remainingSeconds = getCropRemainingTime(instance, now)
  return { growthPercent, remainingSeconds, currentStage:getCropCurrentStage(crop,growthPercent), isReadyToHarvest:remainingSeconds <= 0, readyAt:instance.readyAt }
}

export interface FertilizerResult { instance: CropInstance; reductionSeconds: number }
export const applyFertilizer = (instance: CropInstance, fertilizer: FertilizerDefinition, now = Date.now()): FertilizerResult => {
  if (getCropRemainingTime(instance, now) <= 0) throw new Error('Cây đã chín, không cần bón thêm.')
  const used = instance.fertilizerUsage.filter(item => item.fertilizerId === fertilizer.id).length
  if (used >= fertilizer.maxUsesPerCrop) throw new Error('Đã đạt giới hạn loại phân này.')
  const remaining = getCropRemainingTime(instance, now)
  let reduction = fertilizer.reductionType === 'seconds' ? fertilizer.reductionValue
    : fertilizer.reductionType === 'percentage' ? Math.floor(remaining * fertilizer.reductionValue / 100)
    : remaining
  const minimumRemaining = fertilizer.reductionType === 'instant' ? 0 : 10
  reduction = Math.max(0, Math.min(reduction, remaining - minimumRemaining))
  const newReady = new Date(new Date(instance.readyAt).getTime() - reduction * 1000).toISOString()
  return { reductionSeconds:reduction, instance:{...instance,readyAt:newReady,totalReductionSeconds:instance.totalReductionSeconds+reduction,lastCalculatedAt:new Date(now).toISOString(),fertilizerUsage:[...instance.fertilizerUsage,{fertilizerId:fertilizer.id,usedAt:new Date(now).toISOString(),reductionSeconds:reduction}] } }
}
