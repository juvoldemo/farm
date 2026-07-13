import { LockKeyhole, Plus, ShoppingBasket, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { FarmPlot } from '../types/game'
import { cropById } from '../config/crops'
import { getCropGrowthState } from '../utils/cropGrowth'
import { formatRemainingTime } from '../utils/time'
import { formatNumber } from '../utils/currency'

export function FarmPlotCard({plot,now,onClick,highlight=false}:{plot:FarmPlot;now:number;onClick:()=>void;highlight?:boolean}){
 const crop=plot.cropInstance?cropById(plot.cropInstance.cropId):undefined
 const growth=plot.cropInstance&&crop?getCropGrowthState(plot.cropInstance,crop,now):undefined
 if(!plot.isUnlocked)return <motion.button whileTap={{scale:.95}} className={`plot locked ${highlight?'tutorial-highlight':''}`} onClick={onClick}><span className="plot-number">#{plot.plotNumber}</span><LockKeyhole size={26}/><b>{formatNumber(plot.unlockPrice)} 🪙</b><small>Cấp {plot.requiredLevel}</small></motion.button>
 if(!crop||!growth)return <motion.button whileHover={{y:-3}} whileTap={{scale:.94}} className={`plot empty ${highlight?'tutorial-highlight':''}`} onClick={onClick}><span className="plot-number">#{plot.plotNumber}</span><div className="soil-lines"/><Plus className="plot-plus"/><b>Trồng cây</b></motion.button>
 return <motion.button whileTap={{scale:.95}} className={`plot planted ${growth.isReadyToHarvest?'ready':''}`} onClick={onClick}>
  <span className="plot-number">#{plot.plotNumber}</span>{growth.isReadyToHarvest&&<Sparkles className="spark one"/>}<span className="crop-stage">{growth.currentStage.icon}</span>
  <b>{crop.name}</b>{growth.isReadyToHarvest?<span className="harvest-label"><ShoppingBasket size={14}/> Thu hoạch</span>:<><div className="crop-progress"><i style={{width:`${growth.growthPercent}%`}}/></div><small>{formatRemainingTime(growth.remainingSeconds)}</small></>}
 </motion.button>
}
