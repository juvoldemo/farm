import { cropById, crops } from '../config/crops'
import { orderCustomers } from '../config/orderConfig'
import type { FarmOrder } from '../types/game'
import { createRandomGenerator, randomInteger } from '../utils/random'

export const createFarmOrder=(level:number,seed=Date.now()):FarmOrder=>{const r=createRandomGenerator(seed),available=crops.filter(c=>c.requiredLevel<=level),crop=available[randomInteger(0,available.length-1,r)],quantity=randomInteger(2,Math.min(8,3+level),r),customer=orderCustomers[randomInteger(0,orderCustomers.length-1,r)],rare=r()<.18;return{id:`order-${seed}`,customerName:customer[0],customerAvatar:customer[1],items:[{produceId:crop.id,quantity}],rewardGold:Math.round(crop.sellPrice*quantity*(rare?1.55:1.25)),rewardXp:Math.max(5,Math.round(crop.xpReward*.6)),rewardDiamonds:rare&&r()<.25?1:undefined,createdAt:new Date().toISOString(),rarity:rare?'rare':'normal',status:'active'}}
export const orderTitle=(order:FarmOrder)=>order.items.map(i=>`${i.quantity} ${cropById(i.produceId)?.name??i.produceId}`).join(', ')
