import type { LocationDefinition } from '../types/npc'
export const locations:LocationDefinition[]=[
 {id:'player_farm',name:'Nông trại của bạn',type:'player_farm',backgroundAsset:'farm',connectedLocationIds:['village_road'],openToPlayer:true,icon:'🌾'},
 {id:'village_road',name:'Đường làng',type:'road',backgroundAsset:'road',connectedLocationIds:['player_farm','village_square','hoa_home','hoa_shop','ba_home','ba_farm','lan_home','lan_restaurant'],openToPlayer:true,icon:'🛤️'},
 {id:'village_square',name:'Quảng trường Hoa Nắng',type:'village_square',backgroundAsset:'square',connectedLocationIds:['village_road'],openToPlayer:true,icon:'⛲'},
 {id:'hoa_home',name:'Nhà Cô Hoa',type:'npc_home',backgroundAsset:'home',connectedLocationIds:['village_road'],openToPlayer:true,icon:'🏡'},
 {id:'hoa_shop',name:'Tiệm tạp hóa Hoa Mai',type:'shop',backgroundAsset:'shop',connectedLocationIds:['village_road'],openToPlayer:true,icon:'🏪'},
 {id:'ba_home',name:'Nhà Chú Ba',type:'npc_home',backgroundAsset:'home',connectedLocationIds:['ba_farm','village_road'],openToPlayer:true,icon:'🛖'},
 {id:'ba_farm',name:'Nông trại Chú Ba',type:'npc_farm',backgroundAsset:'npc-farm',connectedLocationIds:['ba_home','village_road'],openToPlayer:true,icon:'🚜'},
 {id:'lan_home',name:'Nhà Chị Lan',type:'npc_home',backgroundAsset:'home',connectedLocationIds:['village_road'],openToPlayer:true,icon:'🏠'},
 {id:'lan_restaurant',name:'Bếp Nhà Lan',type:'restaurant',backgroundAsset:'restaurant',connectedLocationIds:['village_road'],openToPlayer:true,icon:'🍲'},
]
export const locationById=(id:string)=>locations.find(location=>location.id===id)
