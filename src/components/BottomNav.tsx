import { Backpack, Dna, Leaf, ShoppingBasket, Trophy } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/gameStore'
const entries=[['shop','Cửa hàng',ShoppingBasket],['inventory','Kho đồ',Backpack],['genetics','Sổ lai',Dna],['fertilizer','Phân bón',Leaf],['missions','Nhiệm vụ',Trophy]] as const
export function BottomNav({onSelect}:{onSelect:(id:string)=>void}){const [active,setActive]=useState(''),inventory=useGameStore(s=>s.inventory),discoveries=useGameStore(s=>s.hybridDiscoveries.length),ready=useGameStore(s=>s.plots.filter(p=>p.cropInstance&&new Date(p.cropInstance.readyAt).getTime()<=Date.now()).length),nav=<nav className="bottom-nav">{entries.map(([id,label,Icon])=>{const badge=id==='inventory'?inventory.reduce((n,i)=>n+i.quantity,0):id==='genetics'?discoveries:id==='missions'&&ready?ready:0;return <button className={active===id?'active':''} key={id} onClick={()=>{setActive(id);onSelect(id)}}><Icon/><span>{label}</span>{badge>0&&<em>{badge>99?'99+':badge}</em>}</button>})}</nav>;return typeof document==='undefined'?nav:createPortal(nav,document.body)}
