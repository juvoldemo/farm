import type { NpcDefinition } from '../types/npc'
import { npcGiftPreferences } from './npcGiftPreferences'
export const npcs:NpcDefinition[]=[
 {id:'hoa',name:'Cô Hoa',shortName:'Hoa',occupation:'Chủ tiệm tạp hóa',description:'Nhanh nhẹn, vui vẻ và luôn nhớ khách cần gì.',personality:['vui vẻ','quan tâm','nhanh nhẹn'],homeLocationId:'hoa_home',workLocationId:'hoa_shop',avatarUrl:'emoji:👩‍💼',spriteConfig:{icon:'👩‍💼',color:'#f59e9e'},scheduleIds:['hoa-weekday','hoa-sunday'],dialogueProfileId:'hoa',shopId:'hoa-general',relationshipConfig:{pointsPerLevel:100,maxLevel:5},giftPreferences:npcGiftPreferences.hoa},
 {id:'ba',name:'Chú Ba',shortName:'Ba',occupation:'Nông dân lâu năm',description:'Một người làm nông điềm đạm với rất nhiều mẹo hay.',personality:['điềm đạm','kinh nghiệm','hài hước'],homeLocationId:'ba_home',workLocationId:'ba_farm',avatarUrl:'emoji:👨‍🌾',spriteConfig:{icon:'👨‍🌾',color:'#8fc56a'},scheduleIds:['ba-daily'],dialogueProfileId:'ba',relationshipConfig:{pointsPerLevel:100,maxLevel:5},giftPreferences:npcGiftPreferences.ba},
 {id:'lan',name:'Chị Lan',shortName:'Lan',occupation:'Chủ quán ăn',description:'Cởi mở, thích nguyên liệu tươi và những công thức mới.',personality:['cởi mở','hoạt bát','sáng tạo'],homeLocationId:'lan_home',workLocationId:'lan_restaurant',avatarUrl:'emoji:👩‍🍳',spriteConfig:{icon:'👩‍🍳',color:'#f4bd63'},scheduleIds:['lan-daily'],dialogueProfileId:'lan',shopId:'lan-kitchen',relationshipConfig:{pointsPerLevel:100,maxLevel:5},giftPreferences:npcGiftPreferences.lan},
]
export const npcById=(id:string)=>npcs.find(npc=>npc.id===id)
