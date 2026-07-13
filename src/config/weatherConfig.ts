import type { WeatherId } from '../types/game'
export interface WeatherDefinition { id:WeatherId; name:string; icon:string; durationMinutes:number; visualEffect:string; weight:number; cropEffects?:{growthSpeedPercent?:number;yieldBonusPercent?:number;autoWater?:boolean} }
export const weatherDefinitions:WeatherDefinition[]=[
 {id:'sunny',name:'Nắng nhẹ',icon:'☀️',durationMinutes:20,visualEffect:'sunny',weight:36,cropEffects:{yieldBonusPercent:5}},
 {id:'cloudy',name:'Nhiều mây',icon:'☁️',durationMinutes:15,visualEffect:'cloudy',weight:30},
 {id:'rain',name:'Mưa xuân',icon:'🌧️',durationMinutes:12,visualEffect:'rain',weight:18,cropEffects:{growthSpeedPercent:5,yieldBonusPercent:4,autoWater:true}},
 {id:'windy',name:'Gió đồng',icon:'🌬️',durationMinutes:12,visualEffect:'windy',weight:13},
 {id:'rainbow',name:'Cầu vồng',icon:'🌈',durationMinutes:5,visualEffect:'rainbow',weight:3,cropEffects:{yieldBonusPercent:15}},
]
export const weatherById=(id:WeatherId)=>weatherDefinitions.find(w=>w.id===id)!
