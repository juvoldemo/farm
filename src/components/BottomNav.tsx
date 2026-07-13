import { Backpack, Leaf, Map, Palette, ShoppingBasket, Sprout, Trophy, Users } from 'lucide-react'
const entries=[['shop','Cửa hàng',ShoppingBasket],['inventory','Kho đồ',Backpack],['seeds','Hạt giống',Sprout],['fertilizer','Phân bón',Leaf],['missions','Nhiệm vụ',Trophy],['friends','Bạn bè',Users],['decor','Trang trí',Palette],['map','Bản đồ',Map]] as const
export function BottomNav({onSelect}:{onSelect:(id:string)=>void}){return <nav className="bottom-nav">{entries.map(([id,label,Icon])=><button key={id} onClick={()=>onSelect(id)}><Icon/><span>{label}</span></button>)}</nav>}
