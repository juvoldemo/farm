import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Clock, Coins, CloudSun, FastForward, Leaf, Package, Sparkles, Sprout, Trophy } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { useGameStore } from '../store/gameStore'
import type { FarmPlot } from '../types/game'
import { useGameClock } from '../hooks/useGameClock'
import { TopBar } from '../components/TopBar'
import { FarmPlotCard } from '../components/FarmPlotCard'
import { BottomNav } from '../components/BottomNav'
import { CropPanel, DailyPanel, InventoryPanel, MissionsPanel, SeedPicker, SettingsPanel, ShopPanel, UnlockPanel } from '../components/GamePanels'
import { Modal } from '../components/Modal'
import { formatRemainingTime } from '../utils/time'
import { AccountPanel } from '../components/AccountPanel'

type Panel = null|'shop-seed'|'shop-fertilizer'|'inventory'|'missions'|'settings'|'daily'|'account'
const tutorial=[
  'Chạm vào luống đất số 1 để bắt đầu trồng cây.',
  'Chọn hạt cải xanh — loại cây lớn nhanh nhất.',
  'Cây lớn theo thời gian thật, kể cả khi bạn đóng game.',
  'Chạm cây đang lớn để dùng phân bón rút ngắn thời gian.',
  'Khi cây lấp lánh, chạm vào để thu hoạch.',
  'Mở Kho đồ và bán nông sản để nhận vàng.',
  'Tích lũy 500 vàng rồi mở luống đất số 4 nhé!',
]

export function FarmPage(){
 const {plots,player,stats,timeOffsetMs,tutorialStep,setTutorialStep,markLogin}=useGameStore()
 const now=useGameClock(timeOffsetMs),[selected,setSelected]=useState<FarmPlot>(),[mode,setMode]=useState<'seed'|'crop'|'unlock'>(),[panel,setPanel]=useState<Panel>(null),[offline,setOffline]=useState<{seconds:number;ready:number}|null>(null)
 const initialized=useRef(false)
 useEffect(()=>{if(initialized.current)return;initialized.current=true;const saved=new Date(player.lastLoginAt).getTime(),seconds=Math.max(0,Math.floor((Date.now()-saved)/1000)),ready=plots.filter(p=>p.cropInstance&&new Date(p.cropInstance.readyAt).getTime()<=Date.now()+timeOffsetMs).length;if(seconds>=60)setOffline({seconds,ready});markLogin()},[])
 const ready=useMemo(()=>plots.filter(p=>p.cropInstance&&new Date(p.cropInstance.readyAt).getTime()<=now).length,[plots,now])
 const handlePlot=(plot:FarmPlot)=>{setSelected(plot);setMode(!plot.isUnlocked?'unlock':plot.cropInstance?'crop':'seed')}
 const closePlot=()=>{setSelected(undefined);setMode(undefined)}
 const nav=(id:string)=>{if(id==='shop'||id==='seeds')setPanel('shop-seed');else if(id==='fertilizer')setPanel('shop-fertilizer');else if(id==='inventory')setPanel('inventory');else if(id==='missions')setPanel('missions');else toast.info(id==='friends'?'Bạn bè sẽ mở trong bản cập nhật xã hội.':id==='decor'?'Trang trí đang được chuẩn bị.':'Bản đồ vùng đất mới sắp mở!')}
 return <div className={`game-shell ${player.settings.reducedMotion?'reduce-motion':''}`}>
  <Toaster richColors position="top-center"/>
  <div className="sky-decor"><i/><i/><i/></div>
  <TopBar onMissions={()=>setPanel('missions')} onSettings={()=>setPanel('settings')} onDaily={()=>setPanel('daily')} onAccount={()=>setPanel('account')}/>
  <main className="farm-layout">
   <section className="farm-board">
    <div className="farm-title"><div><span className="eyebrow"><CloudSun/> Thung lũng Hoa Nắng</span><h1>Nông trại của bạn</h1><p>Gieo niềm vui, gặt mùa vàng!</p></div><div className="season"><span>🌻</span><div><small>Mùa hiện tại</small><b>Mùa nắng</b></div></div></div>
    <div className="farm-grid" aria-label="24 luống đất">{plots.map(plot=><FarmPlotCard key={plot.id} plot={plot} now={now} onClick={()=>handlePlot(plot)} highlight={tutorialStep===0&&plot.plotNumber===1}/>)}</div>
    <div className="farm-tip"><Sparkles/> Mẹo: cây vẫn tiếp tục lớn khi bạn rời nông trại.</div>
   </section>
   <aside className="side-panel">
    <section className="side-card mission-mini"><header><span><Trophy/> Nhiệm vụ nhanh</span><button onClick={()=>setPanel('missions')}>Xem tất cả</button></header><div className="mini-mission"><i>🌱</i><div><b>Nhà gieo hạt</b><span>Trồng 5 cây</span><div><em style={{width:`${Math.min(100,stats.planted/5*100)}%`}}/></div></div><strong>{Math.min(stats.planted,5)}/5</strong></div><div className="mini-mission"><i>🧺</i><div><b>Mùa vụ đầu tiên</b><span>Thu hoạch 10 nông sản</span><div><em style={{width:`${Math.min(100,stats.harvested/10*100)}%`}}/></div></div><strong>{Math.min(stats.harvested,10)}/10</strong></div></section>
    <section className="side-card ready-card"><div className="ready-icon">{ready?'🧺':'🌱'}</div><div><small>Tình trạng cây</small><b>{ready?`${ready} luống đã chín`:'Tất cả đang ổn'}</b><span>{ready?'Chạm cây lấp lánh để thu hoạch!':'Hãy gieo thêm một mùa mới.'}</span></div></section>
    <section className="side-card weather"><CloudSun/><div><small>Thời tiết</small><b>26°C · Nắng nhẹ</b><span>Ngày hoàn hảo để gieo hạt</span></div></section>
   </aside>
  </main>
  <BottomNav onSelect={nav}/>
  <SeedPicker plot={mode==='seed'?selected:undefined} onClose={closePlot}/><CropPanel plot={mode==='crop'?selected:undefined} now={now} onClose={closePlot}/><UnlockPanel plot={mode==='unlock'?selected:undefined} onClose={closePlot}/>
  <ShopPanel open={panel==='shop-seed'||panel==='shop-fertilizer'} initialTab={panel==='shop-fertilizer'?'fertilizer':'seed'} onClose={()=>setPanel(null)}/><InventoryPanel open={panel==='inventory'} onClose={()=>setPanel(null)}/><MissionsPanel open={panel==='missions'} onClose={()=>setPanel(null)}/><SettingsPanel open={panel==='settings'} onClose={()=>setPanel(null)}/><DailyPanel open={panel==='daily'} onClose={()=>setPanel(null)}/>
  <AccountPanel open={panel==='account'} onClose={()=>setPanel(null)}/>
  <Modal open={!!offline} title="Trong lúc bạn vắng mặt" onClose={()=>setOffline(null)}><div className="offline"><Clock/><h3>Thời gian trôi thật nhanh!</h3><p>Bạn đã rời nông trại <b>{offline&&formatRemainingTime(offline.seconds)}</b>.</p><div><Sprout/> {offline?.ready?`${offline.ready} cây đã chín và đang chờ bạn.`:'Cây trồng vẫn tiếp tục lớn khỏe.'}</div><button className="primary" onClick={()=>setOffline(null)}>Về nông trại</button></div></Modal>
  <AnimatePresence>{tutorialStep<tutorial.length&&<motion.aside className="tutorial-card" initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} exit={{opacity:0}}><div className="guide-avatar">👩‍🌾</div><div><small>HƯỚNG DẪN · {tutorialStep+1}/{tutorial.length}</small><b>{tutorial[tutorialStep]}</b><div className="tutorial-actions"><button onClick={()=>setTutorialStep(tutorial.length)}>Bỏ qua</button><button onClick={()=>setTutorialStep(tutorialStep+1)}>{tutorialStep===tutorial.length-1?'Hoàn tất':'Tiếp tục'} <ChevronRight/></button></div></div></motion.aside>}</AnimatePresence>
  {import.meta.env.DEV&&<DevPanel/>}
 </div>
}

function DevPanel(){const s=useGameStore();const [open,setOpen]=useState(false);return <aside className={`dev-panel ${open?'open':''}`}><button className="dev-toggle" onClick={()=>setOpen(!open)}>🛠️ DEV</button>{open&&<div><b>Bảng kiểm thử</b><button onClick={s.devAddGold}><Coins/> +10.000 vàng</button><button onClick={s.devAddDiamonds}>💎 +100 kim cương</button><button onClick={s.devLevelUp}><Trophy/> Lên cấp</button><button onClick={s.devFinishCrops}><CheckCircle2/> Chín tất cả cây</button><button onClick={s.devUnlockAll}>🔓 Mở toàn bộ đất</button><button onClick={()=>s.devSkipTime(60)}><FastForward/> +1 phút</button><button onClick={()=>s.devSkipTime(3600)}><FastForward/> +1 giờ</button></div>}</aside>}
