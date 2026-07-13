import { npcAmbientActions } from '../config/npcAmbientActions'
import type { NpcRuntimeState } from '../types/npc'
import { createRandomGenerator, randomInteger } from '../utils/random'
export const getNpcAmbientAction=(state:NpcRuntimeState,now=Date.now())=>{const options=npcAmbientActions.filter(action=>action.activityType===state.currentActivity&&action.allowedLocations.includes(state.currentLocationId));if(!options.length)return undefined;const bucket=Math.floor(now/30_000),random=createRandomGenerator(bucket+[...state.npcId].reduce((sum,char)=>sum+char.charCodeAt(0),0)),total=options.reduce((sum,action)=>sum+action.weight,0);let roll=randomInteger(1,total,random);for(const action of options){roll-=action.weight;if(roll<=0)return action}return options[0]}
