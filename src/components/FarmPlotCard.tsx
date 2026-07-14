import { LockKeyhole, Plus, ShoppingBasket, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { FarmPlot } from '../types/game'
import { cropById } from '../config/crops'
import { getCropGrowthState } from '../utils/cropGrowth'
import { formatRemainingTime } from '../utils/time'
import { formatNumber } from '../utils/currency'
import { memo } from 'react'

export interface HarvestFeedback {quantity:number;cropName:string;phase:'harvesting'|'confirmed'}

export const FarmPlotCard=memo(function FarmPlotCard({plot,now,onClick,highlight=false,readOnly=false,harvestFeedback}:{plot:FarmPlot;now:number;onClick?:(plot:FarmPlot)=>void;highlight?:boolean;readOnly?:boolean;harvestFeedback?:HarvestFeedback}){
 const crop=plot.cropInstance?cropById(plot.cropInstance.cropId):undefined
 const growth=plot.cropInstance&&crop?getCropGrowthState(plot.cropInstance,crop,now):undefined
 if(!plot.isUnlocked)return <motion.button whileTap={readOnly?undefined:{scale:.95}} aria-disabled={readOnly} className={`plot locked ${readOnly?'visitor-plot':''} ${highlight?'tutorial-highlight':''}`} onClick={readOnly?undefined:()=>onClick?.(plot)}><span className="plot-number">#{plot.plotNumber}</span><LockKeyhole size={26}/><b>{formatNumber(plot.unlockPrice)} 🪙</b><small>Cấp {plot.requiredLevel}</small></motion.button>
 if(!crop||!growth)return <motion.button whileHover={readOnly||harvestFeedback?undefined:{y:-3}} whileTap={readOnly||harvestFeedback?undefined:{scale:.94}} aria-disabled={readOnly||!!harvestFeedback} disabled={!!harvestFeedback} className={`plot empty ${readOnly?'visitor-plot':''} ${highlight?'tutorial-highlight':''} ${harvestFeedback?'post-harvest':''}`} onClick={readOnly?undefined:()=>onClick?.(plot)}><span className="plot-number">#{plot.plotNumber}</span><div className="soil-lines"/>{!readOnly&&!harvestFeedback&&<Plus className="plot-plus"/>}<b>{harvestFeedback?'Đã thu hoạch':readOnly?'Đất trống':'Trồng cây'}</b>{harvestFeedback&&<span className="harvest-reward">+{harvestFeedback.quantity} {harvestFeedback.cropName}</span>}</motion.button>
 return <motion.button whileTap={readOnly||harvestFeedback?undefined:{scale:.95}} aria-disabled={readOnly||!!harvestFeedback} disabled={!!harvestFeedback} className={`plot planted ${readOnly?'visitor-plot':''} ${growth.isReadyToHarvest?'ready':''} ${harvestFeedback?'harvesting':''}`} onClick={readOnly?undefined:()=>onClick?.(plot)}>
  <span className="plot-number">#{plot.plotNumber}</span>{growth.isReadyToHarvest&&<Sparkles className="spark one"/>}<span className={`crop-stage ${growth.currentStage.animation??''}`} style={{transform:`scale(${growth.currentStage.scale??1})`}}>{growth.currentStage.icon}</span>
  {!growth.isReadyToHarvest&&<span className="care-flags">{(plot.cropInstance?.care?.water??50)<35?'💧':''}{plot.cropInstance?.care?.weeds?'🌿':''}{plot.cropInstance?.care?.pests?'🐛':''}</span>}
  {!!plot.cropInstance?.traits?.length&&<span className="plot-genetics" title="Cây có đặc tính">🧬</span>}
  <b>{crop.name}</b>{growth.isReadyToHarvest?<span className="harvest-label"><ShoppingBasket size={14}/> {harvestFeedback?'Đang nhận':readOnly?'Đã chín':'Thu hoạch'}</span>:<><div className="crop-progress"><i style={{width:`${growth.growthPercent}%`}}/></div><small>{formatRemainingTime(growth.remainingSeconds)}</small></>}{harvestFeedback&&<span className="harvest-reward">+{harvestFeedback.quantity} {harvestFeedback.cropName}</span>}
 </motion.button>
})
