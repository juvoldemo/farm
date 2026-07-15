import { toast } from 'sonner'
import { useGameStore } from '../../store/gameStore'
import { randomEvents } from '../../config/randomEvents'
import { useGameClock } from '../../hooks/useGameClock'
export function RandomFarmEvent(){const state=useGameStore(s=>s.randomEventState),claim=useGameStore(s=>s.claimRandomEvent),now=useGameClock();if(!state.activeEventId||!state.expiresAt||new Date(state.expiresAt).getTime()<now)return null;const event=randomEvents.find(e=>e.id===state.activeEventId);if(!event)return null;return <button type="button" className={`random-event ${event.id}`} aria-label={`${event.name}, chạm để nhận quà`} onClick={()=>{try{const reward=claim();toast.success(reward.seeds?`Nhặt được ${reward.seeds} hạt giống!`:`Bắt được bướm vàng: +${reward.gold} vàng!`)}catch(e){toast.error(e instanceof Error?e.message:'Sự kiện đã hết')}}}><span>{'image'in event?<img src={event.image} alt=""/>:event.icon}</span><b>{event.name}</b><small>Chạm để nhận quà</small></button>}
