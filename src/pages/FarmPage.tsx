import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Clock, Coins, CloudSun, FastForward, Sparkles, Sprout, Trophy, Users } from 'lucide-react'
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
import { FarmBackground } from '../components/farm/FarmBackground'
import { WeatherEffects } from '../components/farm/WeatherEffects'
import { FarmCharacter } from '../components/farm/FarmCharacter'
import { RandomFarmEvent } from '../components/farm/RandomFarmEvent'
import { OrderBoard } from '../components/farm/OrderBoard'
import { useFarmCharacter } from '../hooks/useFarmCharacter'
import { randomChance } from '../utils/random'
import { randomEvents } from '../config/randomEvents'
import { VillageDevTools, VillagePage } from '../components/village/VillagePage'

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
 const {plots,player,stats,timeOffsetMs,tutorialStep,setTutorialStep,markLogin,currentWeather,refreshWeather,ensureOrders,spawnRandomEvent}=useGameStore()
 const character=useFarmCharacter()
 const now=useGameClock(timeOffsetMs),[view,setView]=useState<'farm'|'village'>(()=>new URLSearchParams(window.location.search).get('view')==='village'?'village':'farm'),[selected,setSelected]=useState<FarmPlot>(),[mode,setMode]=useState<'seed'|'crop'|'unlock'>(),[panel,setPanel]=useState<Panel>(null),[offline,setOffline]=useState<{seconds:number;ready:number}|null>(null)
 const initialized=useRef(false)
 useEffect(()=>{if(initialized.current)return;initialized.current=true;const saved=new Date(player.lastLoginAt).getTime(),seconds=Math.max(0,Math.floor((Date.now()-saved)/1000)),ready=plots.filter(p=>p.cropInstance&&new Date(p.cropInstance.readyAt).getTime()<=Date.now()+timeOffsetMs).length;if(seconds>=60)setOffline({seconds,ready});markLogin()},[])
 useEffect(()=>{refreshWeather();ensureOrders();const id=window.setInterval(()=>refreshWeather(),30_000);return()=>clearInterval(id)},[refreshWeather,ensureOrders])
 useEffect(()=>{const id=window.setInterval(()=>{const s=useGameStore.getState(),expired=!s.randomEventState.expiresAt||new Date(s.randomEventState.expiresAt).getTime()<Date.now(),today=new Date().toISOString().slice(0,10),claimed=s.randomEventState.dayKey===today?s.randomEventState.claimedToday:0,last=s.randomEventState.lastEventAt?new Date(s.randomEventState.lastEventAt).getTime():0;const event=randomEvents.find(item=>s.player.level>=item.minLevel&&claimed<item.dailyLimit&&Date.now()-last>=item.cooldownMinutes*60_000&&randomChance(item.spawnChance));if((!s.randomEventState.activeEventId||expired)&&event)spawnRandomEvent(event.id)},30_000);return()=>clearInterval(id)},[spawnRandomEvent])
 const ready=useMemo(()=>plots.filter(p=>p.cropInstance&&new Date(p.cropInstance.readyAt).getTime()<=now).length,[plots,now])
 const handlePlot=(plot:FarmPlot)=>{setSelected(plot);setMode(!plot.isUnlocked?'unlock':plot.cropInstance?'crop':'seed')}
 const closePlot=()=>{setSelected(undefined);setMode(undefined)}
 const nav=(id:string)=>{if(id==='shop'||id==='seeds')setPanel('shop-seed');else if(id==='fertilizer')setPanel('shop-fertilizer');else if(id==='inventory')setPanel('inventory');else if(id==='missions')setPanel('missions');else toast.info(id==='friends'?'Bạn bè sẽ mở trong bản cập nhật xã hội.':id==='decor'?'Trang trí đang được chuẩn bị.':'Bản đồ vùng đất mới sắp mở!')}
 const hour=new Date(now).getHours(),dayPhase=hour>=5&&hour<9?'dawn':hour>=9&&hour<17?'day':hour>=17&&hour<19?'sunset':'night'
 return <div className={`game-shell weather-${currentWeather.id} phase-${dayPhase} ${player.settings.reducedMotion?'reduce-motion':''}`}>
  <Toaster richColors position="top-center"/>
  <FarmBackground/><WeatherEffects weather={currentWeather.id}/><div className="sky-decor"><i/><i/><i/></div>
  <TopBar onMissions={()=>setPanel('missions')} onSettings={()=>setPanel('settings')} onDaily={()=>setPanel('daily')} onAccount={()=>setPanel('account')}/>
  {view==='farm'?<main className="farm-layout">
   <section className="farm-board">
    <div className="farm-title"><div><span className="eyebrow"><CloudSun/> Thung lũng Hoa Nắng</span><h1>Nông trại của bạn</h1><p>Gieo niềm vui, gặt mùa vàng!</p></div><button className="village-path" onClick={()=>setView('village')}><Users/> Sang Xóm nhỏ <ChevronRight/></button><div className="season"><span>🌻</span><div><small>Mùa hiện tại</small><b>Mùa nắng</b></div></div></div>
    <div className="farm-grid" aria-label="24 luống đất">{plots.map(plot=><FarmPlotCard key={plot.id} plot={plot} now={now} onClick={()=>handlePlot(plot)} highlight={tutorialStep===0&&plot.plotNumber===1}/>)}</div>
    <FarmCharacter action={character.action} target={character.target}/><RandomFarmEvent/>
    <div className="farm-tip"><Sparkles/> Mẹo: cây vẫn tiếp tục lớn khi bạn rời nông trại.</div>
   </section>
   <aside className="side-panel">
    <section className="side-card mission-mini"><header><span><Trophy/> Nhiệm vụ nhanh</span><button onClick={()=>setPanel('missions')}>Xem tất cả</button></header><div className="mini-mission"><i>🌱</i><div><b>Nhà gieo hạt</b><span>Trồng 5 cây</span><div><em style={{width:`${Math.min(100,stats.planted/5*100)}%`}}/></div></div><strong>{Math.min(stats.planted,5)}/5</strong></div><div className="mini-mission"><i>🧺</i><div><b>Mùa vụ đầu tiên</b><span>Thu hoạch 10 nông sản</span><div><em style={{width:`${Math.min(100,stats.harvested/10*100)}%`}}/></div></div><strong>{Math.min(stats.harvested,10)}/10</strong></div></section>
    <section className="side-card ready-card"><div className="ready-icon">{ready?'🧺':'🌱'}</div><div><small>Tình trạng cây</small><b>{ready?`${ready} luống đã chín`:'Tất cả đang ổn'}</b><span>{ready?'Chạm cây lấp lánh để thu hoạch!':'Hãy gieo thêm một mùa mới.'}</span></div></section>
    <section className="side-card weather"><CloudSun/><div><small>Thời tiết</small><b>{currentWeather.id==='sunny'?'☀️ Nắng nhẹ':currentWeather.id==='rain'?'🌧️ Mưa xuân':currentWeather.id==='cloudy'?'☁️ Nhiều mây':currentWeather.id==='windy'?'🌬️ Gió đồng':'🌈 Cầu vồng'}</b><span>{currentWeather.id==='rain'?'Cây được tưới tự động':currentWeather.id==='rainbow'?'Tăng cơ hội thu hoạch may mắn':'Thời tiết đang ảnh hưởng mùa vụ'}</span></div></section>
    <OrderBoard/>
   </aside>
  </main>:<><VillagePage now={now} onBack={()=>setView('farm')}/>{import.meta.env.DEV&&<VillageDevTools/>}</>}
  <BottomNav onSelect={nav}/>
  <SeedPicker plot={mode==='seed'?selected:undefined} onClose={closePlot}/><CropPanel plot={mode==='crop'?selected:undefined} now={now} onClose={closePlot}/><UnlockPanel plot={mode==='unlock'?selected:undefined} onClose={closePlot}/>
  <ShopPanel open={panel==='shop-seed'||panel==='shop-fertilizer'} initialTab={panel==='shop-fertilizer'?'fertilizer':'seed'} onClose={()=>setPanel(null)}/><InventoryPanel open={panel==='inventory'} onClose={()=>setPanel(null)}/><MissionsPanel open={panel==='missions'} onClose={()=>setPanel(null)}/><SettingsPanel open={panel==='settings'} onClose={()=>setPanel(null)}/><DailyPanel open={panel==='daily'} onClose={()=>setPanel(null)}/>
  <AccountPanel open={panel==='account'} onClose={()=>setPanel(null)}/>
  <Modal open={!!offline} title="Trong lúc bạn vắng mặt" onClose={()=>setOffline(null)}><div className="offline"><Clock/><h3>Thời gian trôi thật nhanh!</h3><p>Bạn đã rời nông trại <b>{offline&&formatRemainingTime(offline.seconds)}</b>.</p><div><Sprout/> {offline?.ready?`${offline.ready} cây đã chín và đang chờ bạn.`:'Cây trồng vẫn tiếp tục lớn khỏe.'}</div><button className="primary" onClick={()=>setOffline(null)}>Về nông trại</button></div></Modal>
  <AnimatePresence>{tutorialStep<tutorial.length&&<motion.aside className="tutorial-card" initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} exit={{opacity:0}}><div className="guide-avatar">👩‍🌾</div><div><small>HƯỚNG DẪN · {tutorialStep+1}/{tutorial.length}</small><b>{tutorial[tutorialStep]}</b><div className="tutorial-actions"><button onClick={()=>setTutorialStep(tutorial.length)}>Bỏ qua</button><button onClick={()=>setTutorialStep(tutorialStep+1)}>{tutorialStep===tutorial.length-1?'Hoàn tất':'Tiếp tục'} <ChevronRight/></button></div></div></motion.aside>}</AnimatePresence>
  {import.meta.env.DEV&&<DevPanel/>}
 </div>
}

function DevPanel(){const s=useGameStore();const [open,setOpen]=useState(false),plantSample=()=>{const plot=useGameStore.getState().plots.find(p=>p.isUnlocked&&!p.cropInstance);if(plot)try{useGameStore.getState().plantCrop(plot.id,'cabbage',true)}catch(e){toast.error(e instanceof Error?e.message:'Không thể trồng')}},addProblem=(kind:'weeds'|'pests'|'dry')=>useGameStore.setState(state=>({plots:state.plots.map(p=>p.cropInstance?{...p,cropInstance:{...p.cropInstance,care:{...(p.cropInstance.care??{water:50,weeds:false,pests:false}),...(kind==='dry'?{water:0}:kind==='weeds'?{weeds:true}:{pests:true})}}}:p)}));return <aside className={`dev-panel ${open?'open':''}`}><button className="dev-toggle" onClick={()=>setOpen(!open)}>🛠️ DEV</button>{open&&<div><b>Bảng kiểm thử</b><button onClick={s.devAddGold}><Coins/> +10.000 vàng</button><button onClick={s.devAddDiamonds}>💎 +100 kim cương</button><button onClick={s.devLevelUp}><Trophy/> Lên cấp</button><button onClick={plantSample}>🌱 Trồng cây mẫu</button><button onClick={s.devFinishCrops}><CheckCircle2/> Chín tất cả cây</button><button onClick={s.devUnlockAll}>🔓 Mở toàn bộ đất</button><button onClick={()=>useGameStore.setState(st=>({plots:st.plots.map((p,i)=>({...p,isUnlocked:i<3}))}))}>🔒 Khóa lại đất</button><button onClick={()=>s.refreshWeather('rain')}>🌧️ Bật mưa</button><button onClick={()=>s.refreshWeather('rainbow')}>🌈 Bật cầu vồng</button><button onClick={()=>addProblem('dry')}>🏜️ Làm đất khô</button><button onClick={()=>addProblem('weeds')}>🌿 Tạo cỏ dại</button><button onClick={()=>addProblem('pests')}>🐛 Tạo sâu</button><button onClick={()=>s.spawnRandomEvent('golden-butterfly')}>🦋 Bướm vàng</button><button onClick={()=>s.spawnRandomEvent('tiny-chest')}>🎁 Rương quà</button><button onClick={s.ensureOrders}>🚚 Tạo đơn hàng</button><button onClick={()=>s.devSkipTime(60)}><FastForward/> +1 phút</button><button onClick={()=>s.devSkipTime(3600)}><FastForward/> +1 giờ</button><button className="danger" onClick={s.resetGame}>♻️ Reset game</button></div>}</aside>}
