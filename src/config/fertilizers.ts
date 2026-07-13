import type { FertilizerDefinition } from '../types/game'
export const fertilizers: FertilizerDefinition[] = [
  {id:'small',name:'Phân bón nhỏ',icon:'🌱',description:'Giảm 5 phút, luôn chừa tối thiểu 10 giây.',priceGold:50,reductionType:'seconds',reductionValue:300,maxUsesPerCrop:2},
  {id:'fast',name:'Phân bón nhanh',icon:'🍀',description:'Giảm 15 phút sinh trưởng.',priceGold:200,reductionType:'seconds',reductionValue:900,maxUsesPerCrop:2},
  {id:'boost',name:'Phân tăng tốc',icon:'🌿',description:'Giảm trọn 1 giờ.',priceGold:500,reductionType:'seconds',reductionValue:3600,maxUsesPerCrop:2},
  {id:'premium',name:'Phân cao cấp',icon:'✨',description:'Giảm 25% thời gian còn lại.',priceDiamonds:3,reductionType:'percentage',reductionValue:25,maxUsesPerCrop:1},
  {id:'instant',name:'Phân siêu tốc',icon:'⚡',description:'Cây hoàn thành ngay lập tức.',priceDiamonds:8,reductionType:'instant',reductionValue:100,maxUsesPerCrop:1},
]
export const fertilizerById = (id: string) => fertilizers.find(f => f.id === id)
