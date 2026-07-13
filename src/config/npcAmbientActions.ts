import type { NpcAmbientAction } from '../types/npc'
export const npcAmbientActions:NpcAmbientAction[]=[
 {id:'shelf',activityType:'working',durationSeconds:35,weight:4,animation:'stocking',allowedLocations:['hoa_shop']},{id:'tea',activityType:'working',durationSeconds:20,weight:1,animation:'drinking',allowedLocations:['hoa_shop'],dialogueChance:.2},
 {id:'soil',activityType:'farming',durationSeconds:40,weight:4,animation:'checking-soil',allowedLocations:['ba_farm']},{id:'fence',activityType:'farming',durationSeconds:45,weight:2,animation:'repairing',allowedLocations:['ba_farm']},
 {id:'chop',activityType:'serving_customers',durationSeconds:30,weight:4,animation:'chopping',allowedLocations:['lan_restaurant']},{id:'tables',activityType:'serving_customers',durationSeconds:25,weight:2,animation:'serving',allowedLocations:['lan_restaurant']},
]
