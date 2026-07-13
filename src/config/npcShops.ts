import type { FoodDefinition, NpcShopItem } from '../types/npc'
export interface NpcShopDefinition { id:string;ownerNpcId:string;name:string;openingHours:{dayOfWeek?:number[];openTime:string;closeTime:string;breakPeriods?:{startTime:string;endTime:string}[]}[];inventory:NpcShopItem[] }
export const foods:FoodDefinition[]=[
 {id:'veggie-bread',name:'Bánh mì rau',icon:'🥪',description:'Tăng 10% XP thu hoạch trong 30 phút.',priceGold:45,availableTimeRanges:[{startTime:'06:00',endTime:'10:00'}],buff:{type:'harvest_xp',value:10,durationMinutes:30}},
 {id:'corn-porridge',name:'Cháo ngô',icon:'🥣',description:'Cây lớn nhanh hơn 5% trong 30 phút.',priceGold:60,availableTimeRanges:[{startTime:'06:00',endTime:'10:00'}],buff:{type:'growth_speed',value:5,durationMinutes:30}},
 {id:'salad',name:'Salad vườn',icon:'🥗',description:'Tăng điểm chăm sóc.',priceGold:70,availableTimeRanges:[{startTime:'11:00',endTime:'14:00'}],buff:{type:'friendship',value:10,durationMinutes:30}},
 {id:'veggie-soup',name:'Súp rau nóng',icon:'🍲',description:'Tăng 5% cơ hội thu hoạch may mắn.',priceGold:85,availableTimeRanges:[{startTime:'11:00',endTime:'14:00'},{startTime:'16:00',endTime:'20:00'}],buff:{type:'lucky_yield',value:5,durationMinutes:30}},
 {id:'baked-potato',name:'Khoai nướng',icon:'🥔',description:'Đi trong xóm nhanh hơn.',priceGold:55,availableTimeRanges:[{startTime:'11:00',endTime:'14:00'},{startTime:'16:00',endTime:'20:00'}],buff:{type:'movement_speed',value:15,durationMinutes:30}},
 {id:'hot-tea',name:'Trà nóng',icon:'🍵',description:'Quà nhỏ ấm áp.',priceGold:30,availableTimeRanges:[{startTime:'16:00',endTime:'20:00'}]},
]
export const npcShops:NpcShopDefinition[]=[
 {id:'hoa-general',ownerNpcId:'hoa',name:'Tiệm tạp hóa Hoa Mai',openingHours:[{dayOfWeek:[1,2,3,4,5,6],openTime:'07:00',closeTime:'18:00',breakPeriods:[{startTime:'11:30',endTime:'13:00'}]},{dayOfWeek:[0],openTime:'07:00',closeTime:'16:00',breakPeriods:[{startTime:'11:30',endTime:'13:00'}]}],inventory:[{id:'hoa-cabbage',itemType:'seed',referenceId:'cabbage',priceGold:10,stock:20},{id:'hoa-carrot',itemType:'seed',referenceId:'carrot',priceGold:25,stock:12},{id:'hoa-small-fert',itemType:'fertilizer',referenceId:'small',priceGold:50,stock:6},{id:'hoa-flower',itemType:'gift',referenceId:'small-flower',priceGold:35,stock:5,rotation:true},{id:'hoa-tea',itemType:'gift',referenceId:'tea',priceGold:30,stock:5,rotation:true},{id:'hoa-tool',itemType:'tool',referenceId:'garden-tool',priceGold:120,stock:2,friendshipLevel:2,rotation:true}]},
 {id:'lan-kitchen',ownerNpcId:'lan',name:'Bếp Nhà Lan',openingHours:[{openTime:'06:00',closeTime:'20:00',breakPeriods:[{startTime:'10:00',endTime:'11:00'},{startTime:'14:00',endTime:'16:00'}]}],inventory:foods.map(food=>({id:`lan-${food.id}`,itemType:'food' as const,referenceId:food.id,priceGold:food.priceGold,stock:8}))},
]
export const npcShopById=(id:string)=>npcShops.find(shop=>shop.id===id)
export const foodById=(id:string)=>foods.find(food=>food.id===id)
