import { memo, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  getCropVisualConfig,
} from '../../config/cropVisualConfig'
import type { CropVisualStage, GraphicsQuality } from '../../types/farm'

export interface CropVisualProps {
  cropId: string
  stage: CropVisualStage
  plotNumber: number
  graphicsQuality?: GraphicsQuality
  reducedMotion?: boolean
  className?: string
  style?: CSSProperties
}

const fruitPositions = [
  { x:0, y:-10, rotate:-3 },
  { x:-15, y:2, rotate:-10 },
  { x:15, y:3, rotate:9 },
  { x:0, y:11, rotate:4 },
] as const

export const CropVisual = memo(function CropVisual({
  cropId,
  stage,
  plotNumber,
  graphicsQuality = 'medium',
  reducedMotion = false,
  className,
  style,
}: CropVisualProps){
  const prefersReducedMotion = useReducedMotion()
  const visual = getCropVisualConfig(cropId)[stage]
  const normalizedPlotNumber = Number.isFinite(plotNumber)
    ? Math.max(1,Math.floor(plotNumber))
    : 1
  const duration = 2.45+(normalizedPlotNumber%5)*.17
  const delay = -(normalizedPlotNumber%7)*.12
  const animationEnabled = !reducedMotion&&!prefersReducedMotion&&graphicsQuality!=='low'
  const movement = graphicsQuality==='high'?2.5:1.5
  const rotation = graphicsQuality==='high'?1.8:1
  const configuredFruitCount = visual.fruitCount??0
  const fruitCount = stage==='harvestable'
    ? graphicsQuality==='low'
      ? Math.min(2,configuredFruitCount)
      : graphicsQuality==='medium'
        ? Math.min(3,configuredFruitCount)
        : configuredFruitCount
    : 0

  return <span
    aria-hidden="true"
    className={`crop-visual ${className??''}`.trim()}
    data-crop-id={cropId}
    data-crop-stage={stage}
    style={{
      position:'relative',
      display:'inline-grid',
      placeItems:'end center',
      width:'3.75rem',
      height:'3.75rem',
      isolation:'isolate',
      ...style,
    }}
  >
    <span
      className="crop-visual__shadow"
      style={{
        position:'absolute',
        zIndex:0,
        left:'15%',
        right:'15%',
        bottom:'.12rem',
        height:'.56rem',
        borderRadius:'50%',
        background:'rgba(66,45,24,.3)',
        filter:graphicsQuality==='low'?'none':'blur(2px)',
        transform:`scaleX(${visual.shadowScale})`,
        transformOrigin:'center',
        transition:animationEnabled?'transform 320ms ease':'none',
      }}
    />
    <span
      className="crop-visual__scale"
      style={{
        position:'relative',
        zIndex:1,
        display:'inline-grid',
        placeItems:'center',
        width:'3.3rem',
        height:'3.35rem',
        transform:`scale(${visual.scale})`,
        transformOrigin:'50% 100%',
        transition:animationEnabled?'transform 320ms ease, opacity 220ms ease':'none',
      }}
    >
      <AnimatePresence initial={false}>
      <motion.span
        key={stage}
        className="crop-visual__animation"
        animate={animationEnabled
          ? {opacity:1,scale:1,y:[0,-movement,0],rotate:[-rotation,rotation,-rotation]}
          : {opacity:1,scale:1,y:0,rotate:0}}
        initial={animationEnabled?{opacity:0,scale:.9}:false}
        exit={animationEnabled?{opacity:0,scale:.94,transition:{duration:.18}}:undefined}
        transition={animationEnabled
          ? {duration,delay,repeat:Infinity,ease:'easeInOut',opacity:{duration:.22},scale:{duration:.28}}
          : {duration:0}}
        style={{
          position:'relative',
          gridArea:'1 / 1',
          display:'inline-grid',
          placeItems:'center',
          width:'100%',
          height:'100%',
          lineHeight:1,
          filter:stage==='harvestable'
            ? `drop-shadow(0 0 6px ${visual.glowColor}) drop-shadow(0 4px 2px rgba(55,35,18,.3))`
            : 'drop-shadow(0 4px 2px rgba(55,35,18,.28))',
          transformOrigin:'50% 100%',
        }}
      >
        <span
          className="crop-visual__plant"
          style={{fontSize:'2.45rem',position:'relative',zIndex:1}}
        >{visual.glyph}</span>
        {visual.fruitGlyph&&fruitPositions.slice(0,fruitCount).map((position,index)=><span
          className="crop-visual__fruit"
          key={`${position.x}:${position.y}`}
          style={{
            position:'absolute',
            zIndex:2+index,
            left:'50%',
            top:'48%',
            fontSize:'1.42rem',
            transform:`translate(calc(-50% + ${position.x}px),calc(-50% + ${position.y}px)) rotate(${position.rotate}deg)`,
            filter:'drop-shadow(0 2px 1px rgba(55,35,18,.25))',
          }}
        >{visual.fruitGlyph}</span>)}
      </motion.span>
      </AnimatePresence>
    </span>
  </span>
})
