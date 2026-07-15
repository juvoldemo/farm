import { LockKeyhole, Plus, ShoppingBasket, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { memo, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { CropDefinition, CropInstance, FarmPlot } from '../types/game'
import type { GraphicsQuality } from '../types/farm'
import { cropById } from '../config/crops'
import { getCropGrowthState } from '../utils/cropGrowth'
import { formatRemainingTime } from '../utils/time'
import { formatNumber } from '../utils/currency'
import { CropVisual } from './farm/CropVisual'
import { getCropVisualStage } from '../config/cropVisualConfig'
import { useGameClock, useGameClockValue } from '../hooks/useGameClock'

export interface HarvestFeedback {quantity:number;cropName:string;xp:number;phase:'harvesting'|'confirmed'}

interface FarmPlotCardProps {
  plot: FarmPlot
  timeOffsetMs?: number
  onClick?: (plot: FarmPlot) => void
  highlight?: boolean
  readOnly?: boolean
  harvestFeedback?: HarvestFeedback
  graphicsQuality?: GraphicsQuality
  reducedMotion?: boolean
}

interface PlantedPlotProps extends Omit<FarmPlotCardProps,'plot'> {
  plot: FarmPlot & {cropInstance: CropInstance}
  crop: CropDefinition
}

const plotStyle = (plotNumber: number) => ({'--plot-number':plotNumber} as CSSProperties)
const lastFertilizedAt = (instance: CropInstance) => {
  const usage = instance.fertilizerUsage?.at(-1)
  return usage ? new Date(usage.usedAt).getTime() : 0
}
const wasRecent = (timestamp: number, now: number) => timestamp>0&&now-timestamp>=0&&now-timestamp<2400

export const FarmPlotCard = memo(function FarmPlotCard({plot,timeOffsetMs=0,onClick,highlight=false,readOnly=false,harvestFeedback,graphicsQuality='medium',reducedMotion=false}:FarmPlotCardProps) {
  const instance = plot.cropInstance
  const crop = instance ? cropById(instance.cropId) : undefined
  const inactive = readOnly||!!harvestFeedback
  const activate = inactive ? undefined : () => onClick?.(plot)
  const commonClass = `${readOnly?'visitor-plot ':''}${highlight?'tutorial-plot ':''}${harvestFeedback?'harvesting ':''}`

  if(!plot.isUnlocked) {
    const label = `Ô đất số ${plot.plotNumber} đang khóa, cần ${formatNumber(plot.unlockPrice)} vàng, yêu cầu cấp ${plot.requiredLevel}${readOnly?', chỉ xem':''}`
    return <PlotFocusKeeper highlight={highlight}><motion.button type="button" whileHover={readOnly||reducedMotion?undefined:{y:-2}} whileTap={readOnly||reducedMotion?undefined:{scale:.96}} aria-label={label} aria-disabled={readOnly} data-plot-number={plot.plotNumber} data-status="locked" style={plotStyle(plot.plotNumber)} className={`plot plot-isometric locked ${commonClass}`} onClick={activate}>
      <span className={`plot-visual ${highlight?'tutorial-highlight':''}`} aria-hidden="true">
        <span className="plot-ground-shadow" />
        <span className="plot-island"><span className="plot-top-face"><span className="plot-lock-medallion"><LockKeyhole /></span></span></span>
      </span>
      <span className="plot-hud"><span className="plot-number">#{plot.plotNumber}</span><span className="plot-status-card"><b>{formatNumber(plot.unlockPrice)} vàng</b><small>Cần cấp {plot.requiredLevel}</small></span></span>
    </motion.button></PlotFocusKeeper>
  }

  if(!instance||!crop) {
    const label = harvestFeedback
      ? `Ô đất số ${plot.plotNumber}, đã thu hoạch, nhận ${harvestFeedback.quantity} ${harvestFeedback.cropName} và ${harvestFeedback.xp} XP`
      : `Ô đất số ${plot.plotNumber}, đất trống${readOnly?', chỉ xem':', nhấn để trồng cây'}`
    return <PlotFocusKeeper highlight={highlight}><motion.button type="button" whileHover={inactive||reducedMotion?undefined:{y:-3}} whileTap={inactive||reducedMotion?undefined:{scale:.96}} aria-label={label} aria-disabled={inactive} data-plot-number={plot.plotNumber} data-status={harvestFeedback?'harvesting':'empty'} style={plotStyle(plot.plotNumber)} className={`plot plot-isometric empty ${harvestFeedback?'post-harvest ':''}${commonClass}`} onClick={activate}>
      <span className={`plot-visual ${highlight?'tutorial-highlight':''}`} aria-hidden="true">
        <span className="plot-ground-shadow" />
        <span className="plot-island"><span className="plot-top-face"><span className="soil-furrows" /></span></span>
        {!readOnly&&!harvestFeedback&&<span className="plot-action-orb"><Plus /></span>}
      </span>
      <span className="plot-hud"><span className="plot-number">#{plot.plotNumber}</span><span className="plot-status-card"><b>{harvestFeedback?'Đã thu hoạch':readOnly?'Đất trống':'Trồng cây'}</b><small>{harvestFeedback?'Đang cập nhật kho':readOnly?'Chưa gieo hạt':'Chạm để chọn hạt giống'}</small></span></span>
      {harvestFeedback&&<span className="harvest-reward" aria-hidden="true"><span>🧺</span> +{harvestFeedback.quantity} {harvestFeedback.cropName} · +{harvestFeedback.xp} XP</span>}
    </motion.button></PlotFocusKeeper>
  }

  return <PlotFocusKeeper highlight={highlight}><RealtimePlantedPlot plot={{...plot,cropInstance:instance}} crop={crop} timeOffsetMs={timeOffsetMs} onClick={onClick} highlight={highlight} readOnly={readOnly} harvestFeedback={harvestFeedback} graphicsQuality={graphicsQuality} reducedMotion={reducedMotion}/></PlotFocusKeeper>
}, (previous,next) => previous.plot===next.plot&&previous.timeOffsetMs===next.timeOffsetMs&&previous.onClick===next.onClick&&previous.highlight===next.highlight&&previous.readOnly===next.readOnly&&previous.harvestFeedback===next.harvestFeedback&&previous.graphicsQuality===next.graphicsQuality&&previous.reducedMotion===next.reducedMotion)

function RealtimePlantedPlot({plot,crop,timeOffsetMs=0,onClick,highlight=false,readOnly=false,harvestFeedback,graphicsQuality='medium',reducedMotion=false}:PlantedPlotProps) {
  const instance = plot.cropInstance
  useGameClockValue(clockNow => {
    const now = clockNow+timeOffsetMs
    const growth = getCropGrowthState(instance,crop,now)
    const visualStage = getCropVisualStage(growth.growthPercent,growth.isReadyToHarvest)
    const wateredAt = instance.care?.wateredAt ? new Date(instance.care.wateredAt).getTime() : 0
    return `${visualStage}:${growth.isReadyToHarvest}:${wasRecent(wateredAt,now)}:${wasRecent(lastFertilizedAt(instance),now)}`
  })

  const now = Date.now()+timeOffsetMs
  const growth = getCropGrowthState(instance,crop,now)
  const visualStage = getCropVisualStage(growth.growthPercent,growth.isReadyToHarvest)
  const wateredAt = instance.care?.wateredAt ? new Date(instance.care.wateredAt).getTime() : 0
  const recentlyWatered = wasRecent(wateredAt,now)
  const recentlyFertilized = wasRecent(lastFertilizedAt(instance),now)
  const inactive = readOnly||!!harvestFeedback
  const activate = inactive ? undefined : () => onClick?.(plot)
  const countdownId = `plot-${plot.plotNumber}-countdown`
  const label = growth.isReadyToHarvest
    ? `Ô đất số ${plot.plotNumber}, cây ${crop.name} đã trưởng thành${readOnly?', chỉ xem':', nhấn để thu hoạch'}`
    : `Ô đất số ${plot.plotNumber}, cây ${crop.name} đang sinh trưởng${readOnly?', chỉ xem':''}`
  const commonClass = `${readOnly?'visitor-plot ':''}${highlight?'tutorial-plot ':''}${harvestFeedback?'harvesting ':''}`

  return <motion.button type="button" whileHover={inactive||reducedMotion?undefined:{y:-3}} whileTap={inactive||reducedMotion?undefined:{scale:.96}} aria-label={harvestFeedback?`Ô đất số ${plot.plotNumber}, đang thu hoạch cây ${crop.name}, dự kiến nhận ${harvestFeedback.quantity} sản phẩm và ${harvestFeedback.xp} XP`:label} aria-describedby={growth.isReadyToHarvest?undefined:countdownId} aria-disabled={inactive} data-plot-number={plot.plotNumber} data-status={growth.isReadyToHarvest?'harvestable':'growing'} data-crop-stage={visualStage} style={plotStyle(plot.plotNumber)} className={`plot plot-isometric planted crop-${visualStage} ${growth.isReadyToHarvest?'ready ':''}${recentlyWatered?'just-watered ':''}${recentlyFertilized?'just-fertilized ':''}${commonClass}`} onClick={activate}>
    <span className={`plot-visual ${highlight?'tutorial-highlight':''}`} aria-hidden="true">
      <span className="plot-ground-shadow" />
      <span className="plot-island"><span className="plot-top-face"><span className="soil-furrows" /></span></span>
      <span className="crop-visual-position"><CropVisual cropId={crop.id} stage={visualStage} plotNumber={plot.plotNumber} graphicsQuality={graphicsQuality} reducedMotion={reducedMotion}/></span>
      {visualStage==='seed'&&<span className="plant-dust" />}
      {recentlyWatered&&<span className="plot-water-effect"><i/><i/><i/></span>}
      {recentlyFertilized&&<span className="plot-fertilizer-effect">−⏱ ✨</span>}
      {growth.isReadyToHarvest&&<><Sparkles className="plot-spark plot-spark-one"/><Sparkles className="plot-spark plot-spark-two"/></>}
    </span>
    <span className="plot-hud">
      <span className="plot-number">#{plot.plotNumber}</span>
      {!growth.isReadyToHarvest&&<span className="care-flags">{(instance.care?.water??50)<35?'💧':''}{instance.care?.weeds?'🌿':''}{instance.care?.pests?'🐛':''}</span>}
      {!!instance.traits?.length&&<span className="plot-genetics" title="Cây có đặc tính">🧬</span>}
      <span className="plot-status-card crop-info"><b>{crop.name}</b>{growth.isReadyToHarvest?<span className="harvest-label"><ShoppingBasket /> {harvestFeedback?'Đang nhận':readOnly?'Đã chín':'Thu hoạch'}</span>:<CropCountdown instance={instance} crop={crop} timeOffsetMs={timeOffsetMs} id={countdownId}/>}</span>
    </span>
    {harvestFeedback&&<span className="harvest-reward" aria-hidden="true"><span>{crop.icon}</span> +{harvestFeedback.quantity} {harvestFeedback.cropName} · +{harvestFeedback.xp} XP</span>}
  </motion.button>
}

const CropCountdown = memo(function CropCountdown({instance,crop,timeOffsetMs,id}:{instance:CropInstance;crop:CropDefinition;timeOffsetMs:number;id:string}) {
  const now = useGameClock(timeOffsetMs)
  const growth = getCropGrowthState(instance,crop,now)
  return <><span className="crop-progress" aria-hidden="true"><i style={{width:`${growth.growthPercent}%`}}/></span><small id={id}>{formatRemainingTime(growth.remainingSeconds)}</small></>
})

function PlotFocusKeeper({children,highlight}:{children:ReactNode;highlight:boolean}) {
  const rootRef=useRef<HTMLDivElement>(null),restoreFocus=useRef(false)
  useLayoutEffect(()=>{
    const root=rootRef.current
    if(restoreFocus.current&&root&&!root.contains(document.activeElement)) root.querySelector('button')?.focus({preventScroll:true})
  })
  return <div ref={rootRef} className={`plot-slot ${highlight?'tutorial-slot':''}`}
    onFocusCapture={()=>{restoreFocus.current=true}}
    onBlurCapture={event=>{
      const root=rootRef.current,target=event.target
      if(event.relatedTarget&&!root?.contains(event.relatedTarget as Node)){restoreFocus.current=false;return}
      if(!event.relatedTarget) queueMicrotask(()=>{if(root?.contains(target))restoreFocus.current=false})
    }}>{children}</div>
}
