import { CloudOff, Leaf, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { SyncStatus } from '../../contexts/AuthContext'
import type { FarmPlot } from '../../types/game'
import type { GraphicsQuality } from '../../types/farm'
import { FarmPlotCard, type HarvestFeedback } from '../FarmPlotCard'
import { FarmCharacter } from './FarmCharacter'
import type { CharacterAction } from '../../hooks/useFarmCharacter'
import { RandomFarmEvent } from './RandomFarmEvent'
import { FarmDecorations } from './FarmDecorations'

interface FarmSceneProps {
  plots: FarmPlot[]
  timeOffsetMs: number
  farmName: string
  graphicsQuality: GraphicsQuality
  reducedMotion: boolean
  character: {action: CharacterAction; target: number}
  syncStatus: SyncStatus
  onRetrySync: () => Promise<void>
  onPlotClick: (plot: FarmPlot) => void
  harvestFeedbacks: Record<string, HarvestFeedback>
  highlightPlotNumber?: number
}

interface PointerGesture {
  x: number
  y: number
  dragged: boolean
}

export function FarmScene({plots,timeOffsetMs,farmName,graphicsQuality,reducedMotion,character,syncStatus,onRetrySync,onPlotClick,harvestFeedbacks,highlightPlotNumber}:FarmSceneProps) {
  const gesture = useRef<PointerGesture>({x:0,y:0,dragged:false})
  const scrollResetTimer = useRef<number | undefined>(undefined)
  const scrollGuardUntil = useRef(0)
  const [isVisible,setIsVisible] = useState(() => document.visibilityState !== 'hidden')

  useEffect(() => {
    const handleVisibility = () => setIsVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearTimeout(scrollResetTimer.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    gesture.current = {x:event.clientX,y:event.clientY,dragged:performance.now()<scrollGuardUntil.current}
  }
  const trackGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (Math.hypot(event.clientX-gesture.current.x,event.clientY-gesture.current.y) > 8) gesture.current.dragged = true
  }
  const suppressDragClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.detail === 0) return
    if (!gesture.current.dragged) return
    event.preventDefault()
    event.stopPropagation()
    gesture.current.dragged = false
  }
  const markScrolling = () => {
    gesture.current.dragged = true
    scrollGuardUntil.current = performance.now()+180
    window.clearTimeout(scrollResetTimer.current)
    scrollResetTimer.current = window.setTimeout(() => { gesture.current.dragged = false }, 180)
  }

  const syncingFailed = syncStatus === 'error' || syncStatus === 'offline'

  return <section className={`farm-board farm-scene graphics-${graphicsQuality} ${syncStatus==='error'?'sync-error ':''}${syncStatus==='offline'?'sync-offline ':''}${isVisible?'':'farm-paused'}`} aria-labelledby="farm-scene-title">
    <header className="farm-scene-header">
      <div>
        <span className="farm-scene-eyebrow"><Leaf /> Khu vườn 2.5D</span>
        <h1 id="farm-scene-title">24 luống đất của bạn</h1>
        <p>Chạm để gieo hạt, chăm cây và thu hoạch ngay khi cây chín.</p>
      </div>
      <div className="farm-name-sign"><span>Nông trại</span><strong>{farmName}</strong></div>
    </header>

    {syncingFailed&&<div id="farm-sync-status" className={`farm-sync-banner ${syncStatus}`} role="status">
      <CloudOff />
      <span>{syncStatus==='offline'?'Đang ngoại tuyến — dữ liệu trên máy vẫn được giữ an toàn.':'Đồng bộ tạm gián đoạn — dữ liệu hiện tại vẫn được giữ nguyên.'}</span>
      {syncStatus==='error'&&<button type="button" onClick={()=>void onRetrySync()}><RefreshCw /> Thử lại</button>}
    </div>}

    <div className="farm-event-rail"><div className="farm-event-scale"><RandomFarmEvent /></div></div>

    <div className="farm-map-viewport" role="region" aria-label="Bản đồ nông trại 24 ô, có thể cuộn trên màn hình nhỏ" aria-describedby={syncingFailed?'farm-sync-status':undefined} tabIndex={0}
      onPointerDownCapture={startGesture} onPointerMoveCapture={trackGesture} onClickCapture={suppressDragClick} onScroll={markScrolling}>
      <div className="farm-map">
        <FarmDecorations />
        <FarmGrid plots={plots} timeOffsetMs={timeOffsetMs} onPlotClick={onPlotClick} harvestFeedbacks={harvestFeedbacks} highlightPlotNumber={highlightPlotNumber} graphicsQuality={graphicsQuality} reducedMotion={reducedMotion}/>
        <FarmCharacter action={character.action} target={character.target}/>
      </div>
    </div>

    <div className="farm-scroll-hint" aria-hidden="true"><span>↔</span> Kéo khu vườn để xem thêm trên màn hình nhỏ</div>
    <div className="farm-tip"><Sparkles/> Cây tiếp tục lớn theo thời gian thật ngay cả khi bạn rời nông trại.</div>
  </section>
}

function FarmGrid({plots,timeOffsetMs,onPlotClick,harvestFeedbacks,highlightPlotNumber,graphicsQuality,reducedMotion}:Pick<FarmSceneProps,'plots'|'timeOffsetMs'|'onPlotClick'|'harvestFeedbacks'|'highlightPlotNumber'|'graphicsQuality'|'reducedMotion'>) {
  return <div className="farm-grid" role="group" aria-label="24 ô đất">
    {plots.map(plot=><FarmPlotCard key={plot.id} plot={plot} timeOffsetMs={timeOffsetMs} onClick={onPlotClick} harvestFeedback={harvestFeedbacks[plot.id]} highlight={highlightPlotNumber===plot.plotNumber} graphicsQuality={graphicsQuality} reducedMotion={reducedMotion}/>) }
  </div>
}
