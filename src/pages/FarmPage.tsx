import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Clock, Coins, CloudSun, FastForward, Sprout, Trophy, Users } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { useGameStore } from '../store/gameStore'
import type { FarmPlot } from '../types/game'
import { useGameClock, useGameClockBucket } from '../hooks/useGameClock'
import { TopBar } from '../components/TopBar'
import type { HarvestFeedback } from '../components/FarmPlotCard'
import { BottomNav } from '../components/BottomNav'
import { CropPanel, DailyPanel, InventoryPanel, MissionsPanel, SeedPicker, SettingsPanel, ShopPanel, UnlockPanel } from '../components/GamePanels'
import { Modal } from '../components/Modal'
import { formatRemainingTime } from '../utils/time'
import { AccountPanel } from '../components/AccountPanel'
import { FarmBackground } from '../components/farm/FarmBackground'
import { WeatherEffects } from '../components/farm/WeatherEffects'
import { OrderBoard } from '../components/farm/OrderBoard'
import { animateFarmer, useFarmCharacter } from '../hooks/useFarmCharacter'
import { randomChance } from '../utils/random'
import { randomEvents } from '../config/randomEvents'
import { VillageDevTools, VillagePage } from '../components/village/VillagePage'
import { FriendsPanel } from '../components/FriendsPanel'
import { NotificationsPanel } from '../components/NotificationsPanel'
import { FriendFarmView } from '../components/FriendFarmView'
import type { FriendFarm } from '../types/database'
import { useAuth } from '../contexts/AuthContext'
import { loadNotifications } from '../services/notificationService'
import { supabase } from '../services/supabaseClient'
import { HybridJournalPanel } from '../components/GeneticsPanels'
import { EconomyDebugLauncher } from '../components/EconomyDebugPanel'
import { HarvestInteractionCoordinator, withHarvestTimeout } from '../services/harvestInteractionService'
import { harvestCropOnServer, harvestErrorMessage } from '../services/geneticsApi'
import { cropById } from '../config/crops'
import { getCropRemainingTime } from '../utils/cropGrowth'
import { SoundManager } from '../services/soundService'
import { triggerHapticFeedback } from '../utils/haptics'
import { FarmScene } from '../components/farm/FarmScene'

type Panel = null|'shop-seed'|'shop-fertilizer'|'inventory'|'genetics'|'missions'|'settings'|'daily'|'account'|'friends'|'notifications'
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
 const auth=useAuth()
 const {plots,player,stats,timeOffsetMs,tutorialStep,setTutorialStep,markLogin,currentWeather,refreshWeather,ensureOrders,spawnRandomEvent}=useGameStore()
 const character=useFarmCharacter()
 const ambientNow=useGameClockBucket(timeOffsetMs)
 const [view,setView]=useState<'farm'|'village'>(()=>new URLSearchParams(window.location.search).get('view')==='village'?'village':'farm'),[selectedPlotId,setSelectedPlotId]=useState<string>(),[mode,setMode]=useState<'seed'|'crop'|'unlock'>(),[panel,setPanel]=useState<Panel>(null),[offline,setOffline]=useState<{seconds:number;ready:number}|null>(null),[friendFarm,setFriendFarm]=useState<FriendFarm|null>(null),[unread,setUnread]=useState(0),[harvestFeedbacks,setHarvestFeedbacks]=useState<Record<string,HarvestFeedback>>({}),[mobilePanelOpen,setMobilePanelOpen]=useState(false)
 const selected=useMemo(()=>plots.find(plot=>plot.id===selectedPlotId),[plots,selectedPlotId])
 const initialized=useRef(false)
 const harvestCoordinator=useRef(new HarvestInteractionCoordinator()),rewardTimers=useRef(new Map<string,number>())
 useEffect(()=>{if(initialized.current)return;initialized.current=true;const saved=new Date(player.lastLoginAt).getTime(),seconds=Math.max(0,Math.floor((Date.now()-saved)/1000)),ready=plots.filter(p=>p.cropInstance&&new Date(p.cropInstance.readyAt).getTime()<=Date.now()+timeOffsetMs).length;if(seconds>=60)setOffline({seconds,ready});markLogin()},[])
 useEffect(()=>{refreshWeather();ensureOrders();const id=window.setInterval(()=>refreshWeather(),30_000);return()=>clearInterval(id)},[refreshWeather,ensureOrders])
 useEffect(()=>{const id=window.setInterval(()=>{const s=useGameStore.getState(),expired=!s.randomEventState.expiresAt||new Date(s.randomEventState.expiresAt).getTime()<Date.now(),today=new Date().toISOString().slice(0,10),claimed=s.randomEventState.dayKey===today?s.randomEventState.claimedToday:0,last=s.randomEventState.lastEventAt?new Date(s.randomEventState.lastEventAt).getTime():0;const event=randomEvents.find(item=>s.player.level>=item.minLevel&&claimed<item.dailyLimit&&Date.now()-last>=item.cooldownMinutes*60_000&&randomChance(item.spawnChance));if((!s.randomEventState.activeEventId||expired)&&event)spawnRandomEvent(event.id)},30_000);return()=>clearInterval(id)},[spawnRandomEvent])
 useEffect(()=>{const client=supabase;if(!auth.session||!client)return;const refresh=()=>void loadNotifications().then(items=>setUnread(items.filter(item=>!item.isRead).length));refresh();const channel=client.channel(`notifications:${auth.session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${auth.session.user.id}`},refresh).subscribe();return()=>{void client.removeChannel(channel)}},[auth.session])
 const clearHarvestFeedback=useCallback((plotId:string,delay=0)=>{window.clearTimeout(rewardTimers.current.get(plotId));const remove=()=>{setHarvestFeedbacks(current=>{if(!current[plotId])return current;const next={...current};delete next[plotId];return next});rewardTimers.current.delete(plotId)};if(delay)rewardTimers.current.set(plotId,window.setTimeout(remove,delay));else remove()},[])
 useEffect(()=>()=>{rewardTimers.current.forEach(timer=>window.clearTimeout(timer));rewardTimers.current.clear()},[])
 const handlePlot=useCallback((plot:FarmPlot)=>{
  if(!plot.isUnlocked||!plot.cropInstance){setSelectedPlotId(plot.id);setMode(!plot.isUnlocked?'unlock':'seed');return}
  const crop=cropById(plot.cropInstance.cropId),currentNow=Date.now()+useGameStore.getState().timeOffsetMs
  if(!crop||getCropRemainingTime(plot.cropInstance,currentNow)>0){setSelectedPlotId(plot.id);setMode('crop');return}
  const predicted=Math.round((crop.minHarvestQuantity+crop.maxHarvestQuantity)/2),clickedAt=performance.now();let activeRequestId=''
  void harvestCoordinator.current.run({plotId:plot.id,
   onStart:requestId=>{activeRequestId=requestId;setHarvestFeedbacks(current=>({...current,[plot.id]:{quantity:predicted,cropName:crop.name,xp:crop.xpReward,phase:'harvesting'}}));const settings=useGameStore.getState().player.settings;SoundManager.play('harvest',settings.sound,settings.volume*.7);triggerHapticFeedback('light',settings.haptics);animateFarmer('harvest',plot.plotNumber);if(import.meta.env.DEV)console.debug('[harvest] optimistic-start',{plotId:plot.id,requestId,latencyMs:Math.round(performance.now()-clickedAt)})},
   request:async requestId=>{if(auth.configured){const response=await withHarvestTimeout(harvestCropOnServer(plot.plotNumber,requestId));useGameStore.getState().applyServerHarvestState(response.state,plot.id,crop.id);return{quantity:response.quantity,xp:response.xp,lucky:!!response.hybridSeed||response.giantQuantity>0}}const result=useGameStore.getState().harvestCrop(plot.id);return{quantity:result.quantity,xp:result.xp,lucky:result.yield.isLuckyHarvest||result.yield.isPerfectHarvest||!!result.genetics.hybridSeed}},
   onSuccess:result=>{setHarvestFeedbacks(current=>({...current,[plot.id]:{quantity:result.quantity,cropName:crop.name,xp:result.xp,phase:'confirmed'}}));if(result.lucky)SoundManager.play('lucky',useGameStore.getState().player.settings.sound,useGameStore.getState().player.settings.volume*.7);if(import.meta.env.DEV)console.debug('[harvest] confirmed',{plotId:plot.id,requestId:activeRequestId,totalMs:Math.round(performance.now()-clickedAt)});clearHarvestFeedback(plot.id,800)},
   onRollback:error=>{clearHarvestFeedback(plot.id);if(auth.configured)void auth.syncNow();if(import.meta.env.DEV)console.error('[harvest] failed',{plotId:plot.id,requestId:activeRequestId,error});toast.error(harvestErrorMessage(error))},
  })
 },[auth.configured,auth.syncNow,clearHarvestFeedback])
 const closePlot=()=>{setSelectedPlotId(undefined);setMode(undefined)}
 const nav=(id:string)=>{if(id==='shop')setPanel('shop-seed');else if(id==='genetics')setPanel('genetics');else if(id==='fertilizer')setPanel('shop-fertilizer');else if(id==='inventory')setPanel('inventory');else if(id==='missions')setPanel('missions');else toast.info(id==='friends'?'Bạn bè sẽ mở trong bản cập nhật xã hội.':id==='decor'?'Trang trí đang được chuẩn bị.':'Bản đồ vùng đất mới sắp mở!')}
 const hour=new Date(ambientNow).getHours(),dayPhase=hour>=5&&hour<9?'dawn':hour>=9&&hour<17?'day':hour>=17&&hour<19?'sunset':'night'
 return <MotionConfig reducedMotion={player.settings.reducedMotion?'always':'user'}><div className={`game-shell weather-${currentWeather.id} phase-${dayPhase} graphics-${player.settings.graphicsQuality} ${player.settings.reducedMotion?'reduce-motion':''}`}>
  <Toaster richColors position="top-center"/>
  <FarmBackground/><WeatherEffects weather={currentWeather.id}/><div className="sky-decor"><i/><i/><i/></div>
  <TopBar unread={unread} onFriends={()=>setPanel('friends')} onNotifications={()=>setPanel('notifications')} onMissions={()=>setPanel('missions')} onSettings={()=>setPanel('settings')} onDaily={()=>setPanel('daily')} onAccount={()=>setPanel('account')}/>
  {view==='farm'?friendFarm?<FriendFarmView farm={friendFarm} onBack={()=>setFriendFarm(null)}/>:<><div className="farm-shortcuts"><button className="village-path" onClick={()=>setView('village')}><Users/> Sang Xóm nhỏ <ChevronRight/></button></div><main className="farm-layout">
   <FarmScene plots={plots} timeOffsetMs={timeOffsetMs} graphicsQuality={player.settings.graphicsQuality} reducedMotion={player.settings.reducedMotion} character={character} syncStatus={auth.status} onRetrySync={auth.syncNow} onPlotClick={handlePlot} harvestFeedbacks={harvestFeedbacks} highlightPlotNumber={tutorialStep===0?1:undefined}/>
    <div className="mobile-panel-shell">
     <button type="button" className="mobile-panel-toggle" aria-expanded={mobilePanelOpen} aria-controls="farm-side-panel" onClick={()=>setMobilePanelOpen(open=>!open)}><Trophy/><span>Tình trạng &amp; đơn hàng</span><ChevronRight/></button>
     <aside id="farm-side-panel" className={`side-panel ${mobilePanelOpen?'mobile-open':''}`}>
      <section className="side-card mission-mini"><header><span><Trophy/> Nhiệm vụ nhanh</span><button onClick={()=>setPanel('missions')}>Xem tất cả</button></header><div className="mini-mission"><i>🌱</i><div><b>Nhà gieo hạt</b><span>Trồng 5 cây</span><div><em style={{width:`${Math.min(100,stats.planted/5*100)}%`}}/></div></div><strong>{Math.min(stats.planted,5)}/5</strong></div><div className="mini-mission"><i>🧺</i><div><b>Mùa vụ đầu tiên</b><span>Thu hoạch 10 nông sản</span><div><em style={{width:`${Math.min(100,stats.harvested/10*100)}%`}}/></div></div><strong>{Math.min(stats.harvested,10)}/10</strong></div></section>
      <FarmStatusCard plots={plots} timeOffsetMs={timeOffsetMs}/>
      <section className="side-card weather"><CloudSun/><div><small>Thời tiết</small><b>{currentWeather.id==='sunny'?'☀️ Nắng nhẹ':currentWeather.id==='rain'?'🌧️ Mưa xuân':currentWeather.id==='cloudy'?'☁️ Nhiều mây':currentWeather.id==='windy'?'🌬️ Gió đồng':'🌈 Cầu vồng'}</b><span>{currentWeather.id==='rain'?'Cây được tưới tự động':currentWeather.id==='rainbow'?'Tăng cơ hội thu hoạch may mắn':'Thời tiết đang ảnh hưởng mùa vụ'}</span></div></section>
      <OrderBoard/>
     </aside>
    </div>
  </main></>:<><RealtimeVillage timeOffsetMs={timeOffsetMs} onBack={()=>setView('farm')}/>{import.meta.env.DEV&&<VillageDevTools/>}</>}
  <BottomNav onSelect={nav}/>
  <SeedPicker plot={mode==='seed'?selected:undefined} onClose={closePlot}/>{mode==='crop'&&selected&&<RealtimeCropPanel plot={selected} timeOffsetMs={timeOffsetMs} onClose={closePlot}/>}<UnlockPanel plot={mode==='unlock'?selected:undefined} onClose={closePlot}/>
  <ShopPanel open={panel==='shop-seed'||panel==='shop-fertilizer'} initialTab={panel==='shop-fertilizer'?'fertilizer':'seed'} onClose={()=>setPanel(null)}/><InventoryPanel open={panel==='inventory'} onClose={()=>setPanel(null)}/><MissionsPanel open={panel==='missions'} onClose={()=>setPanel(null)}/><SettingsPanel open={panel==='settings'} onClose={()=>setPanel(null)}/><DailyPanel open={panel==='daily'} onClose={()=>setPanel(null)}/>
  <HybridJournalPanel open={panel==='genetics'} onClose={()=>setPanel(null)}/>
  <AccountPanel open={panel==='account'} onClose={()=>setPanel(null)}/>
  <FriendsPanel open={panel==='friends'} onClose={()=>setPanel(null)} onVisit={setFriendFarm}/><NotificationsPanel open={panel==='notifications'} onClose={()=>setPanel(null)} onCount={setUnread}/>
  <Modal open={!!offline} title="Trong lúc bạn vắng mặt" onClose={()=>setOffline(null)}><div className="offline"><Clock/><h3>Thời gian trôi thật nhanh!</h3><p>Bạn đã rời nông trại <b>{offline&&formatRemainingTime(offline.seconds)}</b>.</p><div><Sprout/> {offline?.ready?`${offline.ready} cây đã chín và đang chờ bạn.`:'Cây trồng vẫn tiếp tục lớn khỏe.'}</div><button className="primary" onClick={()=>setOffline(null)}>Về nông trại</button></div></Modal>
  <AnimatePresence>{tutorialStep<tutorial.length&&<motion.aside className="tutorial-card" initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} exit={{opacity:0}}><div className="guide-avatar">👩‍🌾</div><div><small>HƯỚNG DẪN · {tutorialStep+1}/{tutorial.length}</small><b>{tutorial[tutorialStep]}</b><div className="tutorial-actions"><button onClick={()=>setTutorialStep(tutorial.length)}>Bỏ qua</button><button onClick={()=>setTutorialStep(tutorialStep+1)}>{tutorialStep===tutorial.length-1?'Hoàn tất':'Tiếp tục'} <ChevronRight/></button></div></div></motion.aside>}</AnimatePresence>
  {import.meta.env.DEV&&<><EconomyDebugLauncher/><DevPanel/></>}
 </div></MotionConfig>
}

function FarmStatusCard({plots,timeOffsetMs}:{plots:FarmPlot[];timeOffsetMs:number}){const now=useGameClock(timeOffsetMs),ready=useMemo(()=>plots.filter(plot=>plot.cropInstance&&new Date(plot.cropInstance.readyAt).getTime()<=now).length,[plots,now]);return <section className="side-card ready-card"><div className="ready-icon">{ready?'🧺':'🌱'}</div><div><small>Tình trạng cây</small><b>{ready?`${ready} luống đã chín`:'Tất cả đang ổn'}</b><span>{ready?'Chạm cây lấp lánh để thu hoạch!':'Hãy gieo thêm một mùa mới.'}</span></div></section>}

function RealtimeCropPanel({plot,timeOffsetMs,onClose}:{plot:FarmPlot;timeOffsetMs:number;onClose:()=>void}){const now=useGameClock(timeOffsetMs);return <CropPanel plot={plot} now={now} onClose={onClose}/>}

function RealtimeVillage({timeOffsetMs,onBack}:{timeOffsetMs:number;onBack:()=>void}){const now=useGameClock(timeOffsetMs);return <VillagePage now={now} onBack={onBack}/>}

function DevPanel(){const s=useGameStore();const [open,setOpen]=useState(false),plantSample=()=>{const plot=useGameStore.getState().plots.find(p=>p.isUnlocked&&!p.cropInstance);if(plot)try{useGameStore.getState().plantCrop(plot.id,'cabbage',true)}catch(e){toast.error(e instanceof Error?e.message:'Không thể trồng')}},addProblem=(kind:'weeds'|'pests'|'dry')=>useGameStore.setState(state=>({plots:state.plots.map(p=>p.cropInstance?{...p,cropInstance:{...p.cropInstance,care:{...(p.cropInstance.care??{water:50,weeds:false,pests:false}),...(kind==='dry'?{water:0}:kind==='weeds'?{weeds:true}:{pests:true})}}}:p)}));return <aside className={`dev-panel ${open?'open':''}`}><button className="dev-toggle" onClick={()=>setOpen(!open)}>🛠️ DEV</button>{open&&<div><b>Bảng kiểm thử</b><button onClick={s.devAddGold}><Coins/> +10.000 vàng</button><button onClick={s.devLevelUp}><Trophy/> Lên cấp</button><button onClick={plantSample}>🌱 Trồng cây mẫu</button><button onClick={s.devFinishCrops}><CheckCircle2/> Chín tất cả cây</button><button onClick={s.devUnlockAll}>🔓 Mở toàn bộ đất</button><button onClick={()=>useGameStore.setState(st=>({plots:st.plots.map((p,i)=>({...p,isUnlocked:i<3}))}))}>🔒 Khóa lại đất</button><button onClick={()=>s.refreshWeather('rain')}>🌧️ Bật mưa</button><button onClick={()=>s.refreshWeather('rainbow')}>🌈 Bật cầu vồng</button><button onClick={()=>addProblem('dry')}>🏜️ Làm đất khô</button><button onClick={()=>addProblem('weeds')}>🌿 Tạo cỏ dại</button><button onClick={()=>addProblem('pests')}>🐛 Tạo sâu</button><button onClick={()=>s.spawnRandomEvent('golden-butterfly')}>🦋 Bướm vàng</button><button onClick={()=>s.spawnRandomEvent('tiny-chest')}>🎁 Rương quà</button><button onClick={s.ensureOrders}>🚚 Tạo đơn hàng</button><button onClick={()=>s.devSkipTime(60)}><FastForward/> +1 phút</button><button onClick={()=>s.devSkipTime(3600)}><FastForward/> +1 giờ</button><button className="danger" onClick={s.resetGame}>♻️ Reset game</button></div>}</aside>}
