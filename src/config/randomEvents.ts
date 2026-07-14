import goldenButterflyImage from '../assets/events/golden-butterfly.png'

export const randomEvents=[
 {id:'golden-butterfly',name:'Bướm vàng',icon:'🦋',image:goldenButterflyImage,spawnChance:.16,durationSeconds:15,minLevel:1,dailyLimit:3,cooldownMinutes:8,reward:{goldMin:5,goldMax:20}},
 {id:'seed-bird',name:'Chim mang hạt',icon:'🐦',spawnChance:.08,durationSeconds:18,minLevel:2,dailyLimit:2,cooldownMinutes:12,reward:{seeds:2}},
 {id:'tiny-chest',name:'Rương đồng',icon:'🎁',spawnChance:.05,durationSeconds:20,minLevel:3,dailyLimit:1,cooldownMinutes:20,reward:{goldMin:30,goldMax:80}},
] as const
