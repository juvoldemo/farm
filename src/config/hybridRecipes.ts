import type { SeedRarity, TraitId } from '../types/game'

export interface HybridRecipe {id:string;parentCropAId:string;parentCropBId:string;resultCropId:string;resultHybridId:string;displayName:string;baseChance:number;resultRarity:SeedRarity;allowedTraits:TraitId[];description:string;hint:string;isActive:boolean}
export const hybridRecipes:HybridRecipe[]=[
 {id:'tomato-pepper',parentCropAId:'tomato',parentCropBId:'pepper',resultCropId:'tomato',resultHybridId:'spicy-tomato',displayName:'Cà chua cay',baseChance:.08,resultRarity:'rare',allowedTraits:['high_yield','high_quality','easy_hybrid'],description:'Cà chua mọng với sức sống của ớt.',hint:'Một loại quả đỏ kết hợp với một loại cây cay.',isActive:true},
 {id:'pumpkin-watermelon',parentCropAId:'pumpkin',parentCropBId:'watermelon',resultCropId:'pumpkin',resultHybridId:'striped-pumpkin',displayName:'Bí sọc khổng lồ',baseChance:.04,resultRarity:'epic',allowedTraits:['giant_fruit','high_yield','drought_resistant'],description:'Bí đỏ mang những đường sọc mát lành.',hint:'Hai loại quả lớn của mùa hè.',isActive:true},
 {id:'corn-cabbage',parentCropAId:'corn',parentCropBId:'cabbage',resultCropId:'corn',resultHybridId:'emerald-corn',displayName:'Ngô ngọc xanh',baseChance:.08,resultRarity:'rare',allowedTraits:['fast_growth','rain_loving','good_seed'],description:'Bắp ngô xanh khỏe và dễ thích nghi.',hint:'Bắp vàng đứng cạnh một luống rau xanh.',isActive:true},
]
export const findHybridRecipe=(a:string,b:string)=>hybridRecipes.find(r=>r.isActive&&((r.parentCropAId===a&&r.parentCropBId===b)||(r.parentCropAId===b&&r.parentCropBId===a)))
