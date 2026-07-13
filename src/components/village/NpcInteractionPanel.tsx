import { useMemo, useState } from 'react'
import { Clock3, Gift, Heart, MapPin, MessageCircle, PackageOpen, ShoppingBasket, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cropById } from '../../config/crops'
import { fertilizerById } from '../../config/fertilizers'
import { locationById } from '../../config/locations'
import { npcById } from '../../config/npcs'
import { foodById, npcShopById } from '../../config/npcShops'
import { friendshipNames, npcActivityLabels } from '../../config/npcUi'
import { getNpcNextActivity, getNpcTimeUntilNextActivity } from '../../services/npcScheduleService'
import { getNpcShopInventory, getNpcShopState } from '../../services/npcShopService'
import { useGameStore } from '../../store/gameStore'
import { formatRemainingTime } from '../../utils/time'
import { SoundManager } from '../../services/soundService'
import { Modal } from '../Modal'

export function NpcInteractionPanel({npcId,now,onClose}:{npcId?:string;now:number;onClose:()=>void}) {
  const npc=npcId?npcById(npcId):undefined
  const state=useGameStore(s=>npcId?s.npcStates[npcId]:undefined)
  const relationship=useGameStore(s=>npcId?s.npcRelationships[npcId]:undefined)
  const shopStates=useGameStore(s=>s.npcShopStates)
  const inventory=useGameStore(s=>s.inventory)
  const actions=useGameStore()
  const [tab,setTab]=useState<'talk'|'shop'|'gift'|'quest'>('talk')
  const [dialogue,setDialogue]=useState('')
  const next=useMemo(()=>npcId?getNpcNextActivity(npcId,now,actions.currentWeather.id):undefined,[npcId,now,actions.currentWeather.id])
  if(!npc||!state||!relationship)return null
  const sleeping=state.currentActivity==='sleeping'
  const shop=npc.shopId?npcShopById(npc.shopId):undefined
  const shopState=shop?shopStates[shop.id]:undefined
  const availability=shop&&shopState?getNpcShopState(shop.id,shopState,state,now):undefined
  const items=shop&&shopState?getNpcShopInventory(shop.id,shopState,relationship,now):[]
  const gifts=inventory.filter(item=>['gift','produce','food','tool'].includes(item.itemType))
  const talk=()=>{try{const result=actions.talkToNpc(npc.id);SoundManager.play('greeting',actions.player.settings.sound,actions.player.settings.volume);setDialogue(result.text);if(result.friendshipGained)toast.success(`+${result.friendshipGained} thân thiết`)}catch(error){setDialogue(error instanceof Error?error.message:'Không thể trò chuyện')}}
  return <Modal open title={npc.name} onClose={onClose}>
    <div className="npc-profile"><div className="npc-portrait" style={{background:npc.spriteConfig.color}}>{npc.spriteConfig.icon}</div><div><small>{npc.occupation}</small><b>{friendshipNames[relationship.friendshipLevel]}</b><div className="friendship-meter"><i style={{width:`${relationship.friendshipPoints%100}%`}}/></div><span><Heart/> {relationship.friendshipPoints} điểm</span></div></div>
    <div className="npc-status"><span><MapPin/> {locationById(state.currentLocationId)?.name}</span><span><Clock3/> {npcActivityLabels[state.currentActivity]}</span><small>Tiếp theo: {next?npcActivityLabels[next.activity]:''} sau {formatRemainingTime(getNpcTimeUntilNextActivity(npc.id,now,actions.currentWeather.id))}</small>{state.movementState&&<div className="movement-progress"><i style={{width:`${state.movementState.progress*100}%`}}/></div>}</div>
    {sleeping?<div className="sleeping-note">🌙 Trong nhà đã tắt đèn. Có lẽ {npc.shortName} đang ngủ.</div>:<>
      <div className="npc-tabs"><button onClick={()=>setTab('talk')}><MessageCircle/> Trò chuyện</button>{shop&&<button onClick={()=>setTab('shop')}><ShoppingBasket/> Mua bán</button>}<button onClick={()=>setTab('gift')}><Gift/> Tặng quà</button><button onClick={()=>setTab('quest')}><Sparkles/> Nhiệm vụ</button></div>
      {tab==='talk'&&<div className="dialogue-box"><div>{npc.spriteConfig.icon}</div><p>{dialogue||`${npc.name} đang ${npcActivityLabels[state.currentActivity]}...`}</p><button onClick={talk}>{dialogue?'Nói chuyện tiếp':'Chào hỏi'}</button></div>}
      {tab==='shop'&&shop&&<div className="npc-shop"><header><b>{shop.name}</b><span className={availability?.availability}>{availability?.reason}</span></header>{items.map(item=>{const food=foodById(item.referenceId),crop=cropById(item.referenceId),fert=fertilizerById(item.referenceId),icon=food?.icon??crop?.icon??fert?.icon??(item.itemType==='gift'?'🎁':'🛠️'),discount=Math.min(10,relationship.friendshipLevel*2),price=Math.ceil(item.priceGold*(100-discount)/100),left=item.stock-(shopState?.purchased[item.id]??0);return <article key={item.id}><span>{icon}</span><div><b>{food?.name??crop?.name??fert?.name??item.referenceId}</b><small>{food?.description??`${left} sản phẩm còn lại`}</small></div><button disabled={availability?.availability!=='open'||left<=0} onClick={()=>{try{const paid=actions.purchaseFromNpc(shop.id,item.id);toast.success(`Đã mua với ${paid} vàng!`)}catch(error){toast.error(error instanceof Error?error.message:'Không thể mua')}}}>{price} 🪙</button></article>})}<h4><PackageOpen/> Bán nông sản</h4><div className="sell-chips">{inventory.filter(item=>item.itemType==='produce').map(item=><button key={item.id} onClick={()=>{try{const gold=actions.sellToNpc(npc.id,item.referenceId,1);toast.success(`Đã bán 1 ${cropById(item.referenceId)?.name}: +${gold} vàng`)}catch(error){toast.error(error instanceof Error?error.message:'Không thể bán')}}}>{cropById(item.referenceId)?.icon} x{item.quantity}</button>)}</div></div>}
      {tab==='gift'&&<div className="gift-grid">{gifts.length?gifts.map(item=><button key={item.id} onClick={()=>{try{const result=actions.giveGiftToNpc(npc.id,item.referenceId);toast.success(`${npc.name} ${result.reaction==='loved'?'rất thích':'đã nhận'} món quà! ${result.points>=0?'+':''}${result.points} điểm`)}catch(error){toast.error(error instanceof Error?error.message:'Không thể tặng')}}}><span>{cropById(item.referenceId)?.icon??foodById(item.referenceId)?.icon??'🎁'}</span><b>{item.referenceId}</b><small>x{item.quantity}</small></button>):<p>Kho chưa có món nào có thể tặng.</p>}</div>}
      {tab==='quest'&&<div className="npc-quest"><Sparkles/><h3>{npc.id==='hoa'?'Nhập hàng cho tiệm':npc.id==='ba'?'Hạt giống cho vụ mới':'Nguyên liệu tươi'}</h3><p>{npc.id==='hoa'?'Mang 10 cải xanh.':npc.id==='ba'?'Mang 5 bắp ngô.':'Mang 3 cà chua.'}</p><b>Thưởng vàng, XP và 20 điểm thân thiết</b><button onClick={()=>{try{const reward=actions.completeNpcQuest(npc.id);toast.success(`Hoàn thành! +${reward.gold} vàng, +${reward.xp} XP`)}catch(error){toast.error(error instanceof Error?error.message:'Chưa thể hoàn thành')}}}>Giao nhiệm vụ</button></div>}
    </>}
  </Modal>
}
