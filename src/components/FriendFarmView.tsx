import { ArrowLeft, Eye, Radio } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cropById } from '../config/crops'
import { stealFriendCrop } from '../services/friendService'
import { useGameStore } from '../store/gameStore'
import type { FarmPlot } from '../types/game'
import type { FriendFarm } from '../types/database'
import { FarmPlotCard } from './FarmPlotCard'

const theftError = (error:unknown) => {
  const message=error instanceof Error?error.message:String(error)
  if(message.includes('CROP_ALREADY_STOLEN'))return 'Luống cây này đã bị lấy trước đó.'
  if(message.includes('CROP_NOT_READY'))return 'Cây chưa trưởng thành.'
  if(message.includes('INVENTORY_FULL'))return 'Kho đã đầy, hãy bán bớt nông sản.'
  if(message.includes('FARM_ACCESS_DENIED'))return 'Bạn không còn quyền ghé thăm nông trại này.'
  return 'Không thể lấy nông sản lúc này.'
}

export function FriendFarmView({farm,onBack}:{farm:FriendFarm;onBack:()=>void}){
  const settings=useGameStore(state=>state.player.settings)
  const [stolenIds,setStolenIds]=useState(()=>new Set(farm.stolenCropInstanceIds))
  const [busyPlot,setBusyPlot]=useState<string>()

  const steal=async(plot:FarmPlot)=>{
    const instance=plot.cropInstance
    if(!instance||busyPlot)return
    setBusyPlot(plot.id)
    try{
      const result=await stealFriendCrop(farm.profile.id,plot.plotNumber)
      useGameStore.getState().replaceGameData(result.state)
      setStolenIds(current=>new Set(current).add(result.cropInstanceId))
      const crop=cropById(result.cropId)
      toast.success(`Đã lấy ${result.quantity} ${crop?.name??'nông sản'} (${result.percentage}% sản lượng).`)
    }catch(error){toast.error(theftError(error))}
    finally{setBusyPlot(undefined)}
  }

  return <main className="friend-farm">
    <header><button onClick={onBack}><ArrowLeft/> Nông trại của tôi</button><span>{farm.profile.avatarUrl?<img src={farm.profile.avatarUrl} alt=""/>:'👩‍🌾'}</span><div><small><Eye/> ĐANG THĂM NÔNG TRẠI CỦA</small><h1>{farm.profile.displayName}</h1><p>@{farm.profile.username} · Cấp {farm.profile.level} · <Radio/> {farm.profile.status==='online'?'Đang online':'Ngoại tuyến'}</p></div></header>
    <section className="farm-board">
      <div className="visitor-note">🧺 Cây đã chín có thể lấy 10–15% sản lượng. Mỗi cây chỉ được lấy một lần.</div>
      <div className="farm-grid">{farm.state.plots.map(plot=>{const cropInstanceId=plot.cropInstance?.id,stolen=!!cropInstanceId&&stolenIds.has(cropInstanceId);return <FarmPlotCard key={plot.id} plot={plot} readOnly onClick={busyPlot?undefined:steal} visitorAction={stolen?'stolen':'steal'} graphicsQuality={settings.graphicsQuality} reducedMotion={settings.reducedMotion}/>} )}</div>
    </section>
  </main>
}
