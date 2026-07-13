import { Bell, Cloud, CloudOff, Gem, LoaderCircle, Mail, Settings, Star, Sun, Trophy } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useAuth } from '../contexts/AuthContext'
import { xpForLevel } from '../utils/level'
import { formatNumber } from '../utils/currency'

export function TopBar({onMissions,onSettings,onDaily,onAccount}:{onMissions:()=>void;onSettings:()=>void;onDaily:()=>void;onAccount:()=>void}){
 const player=useGameStore(s=>s.player), xpMax=xpForLevel(player.level)
 const auth=useAuth(),working=auth.status==='loading'||auth.status==='saving'
 return <header className="topbar">
  <button className="profile-chip" onClick={onAccount} aria-label="Tài khoản và đồng bộ"><div className="avatar">👩‍🌾<span>{player.level}</span></div><div className="profile-copy"><strong>{player.name}</strong><div className="xp"><i style={{width:`${Math.min(100,player.currentXp/xpMax*100)}%`}}/><span>{player.currentXp}/{xpMax} XP</span></div><small className={`cloud-mini ${auth.status}`}>{working?<LoaderCircle className="spin"/>:auth.session?<Cloud/>:<CloudOff/>}{auth.session?(working?'Đang lưu':'Cloud đã bật'):'Chơi cục bộ'}</small></div></button>
  <div className="resource-row"><div className="resource gold"><Sun size={18}/><b>{formatNumber(player.gold)}</b></div><div className="resource diamond"><Gem size={17}/><b>{formatNumber(player.diamonds)}</b></div></div>
  <nav className="top-actions"><button onClick={onDaily} aria-label="Thưởng ngày"><Bell/></button><button onClick={onMissions} aria-label="Nhiệm vụ"><Trophy/></button><button onClick={()=>alert('Hộp thư đang trống!')} aria-label="Thư"><Mail/></button><button onClick={onSettings} aria-label="Cài đặt"><Settings/></button></nav>
  <div className="day-pill"><Star size={16}/> Ngày nắng đẹp</div>
 </header>
}
