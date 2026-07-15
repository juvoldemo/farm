import type { GameStateData, SeedInstance } from '../types/game'
import { normalizeCloudState } from './cloudSaveService'
import { supabase } from './supabaseClient'

const client=()=>{if(!supabase)throw new Error('Supabase chưa được cấu hình.');return supabase}
export interface ServerHarvestResult {state:GameStateData;quantity:number;xp:number;quality:'normal'|'silver'|'gold';giantQuantity:number;hybridAttempted:boolean;hybridSeed:SeedInstance|null;hybridChance:number;pending:boolean}
export const plantCropOnServer=async(plotIndex:number,cropId:string,seedInstanceId?:string)=>{const {data,error}=await client().rpc('plant_crop_v3',{p_plot_index:plotIndex,p_crop_id:cropId,p_seed_instance_id:seedInstanceId??null});if(error)throw error;const value=data as {state:unknown};return {...value,state:normalizeCloudState(value.state)}}
const harvestRecoveryErrors=['CROP_NOT_FOUND','ALREADY_HARVESTED','CROP_NOT_MATURE','HARVEST_IN_PROGRESS']
const errorText=(error:unknown)=>error instanceof Error?error.message:typeof error==='object'&&error&&'message'in error?String(error.message):String(error)
export const shouldRecoverLegacyHarvest=(error:unknown)=>harvestRecoveryErrors.some(code=>errorText(error).includes(code))
export const harvestErrorMessage=(error:unknown)=>{const message=errorText(error);if(message.includes('INVENTORY_FULL'))return 'Kho đã đầy! Hãy bán bớt nông sản.';if(message.includes('CROP_NOT_READY')||message.includes('CROP_NOT_MATURE'))return 'Cây chưa chín trên máy chủ. Hãy đồng bộ rồi thử lại.';if(message.includes('AUTH_REQUIRED')||message.includes('JWT'))return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';if(message.includes('HARVEST_TIMEOUT'))return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.';return 'Thu hoạch chưa thành công, vui lòng thử lại.'}
export const harvestCropOnServer=async(plotIndex:number,requestId:string=crypto.randomUUID()):Promise<ServerHarvestResult>=>{
 const api=client(),params={p_plot_index:plotIndex,p_request_id:requestId}
 let {data,error}=await api.rpc('harvest_crop_v3',params)
 // v3 cũ kiểm tra player_crops trước khi v2 có thể khôi phục cây legacy từ game_saves.
 if(error&&shouldRecoverLegacyHarvest(error))({data,error}=await api.rpc('harvest_crop_v2',params))
 if(error)throw error
 const value=data as Omit<ServerHarvestResult,'state'>&{state:unknown}
 return {...value,state:normalizeCloudState(value.state)}
}
export const loadServerSeeds=async()=>{const {data,error}=await client().from('seed_instances').select('*').in('status',['inventory','pending']).order('created_at',{ascending:false});if(error)throw error;return data}
export const loadHybridJournal=async()=>{const {data,error}=await client().from('player_hybrid_discoveries').select('*').order('discovered_at',{ascending:false});if(error)throw error;return data}
export const buyGeneticSeedOnServer=async(cropId:string,requestId=crypto.randomUUID())=>{const {data,error}=await client().rpc('buy_genetic_seed',{p_crop_id:cropId,p_request_id:requestId});if(error)throw error;const value=data as {state:unknown;seed:unknown;cost:number};return {...value,state:normalizeCloudState(value.state)}}
export const loadPendingSeedRewards=async()=>{const {data,error}=await client().from('pending_seed_rewards').select('id,created_at,seed_instances(id,crop_id,rarity,traits,generation,hybrid_id)').is('claimed_at',null).order('created_at',{ascending:true});if(error)throw error;return data as unknown as Array<{id:string;created_at:string;seed_instances:{id:string;crop_id:string;rarity:string;traits:unknown[];generation:number;hybrid_id:string|null}}>} 
export const claimPendingSeed=async(rewardId:string)=>{const {data,error}=await client().rpc('claim_pending_seed',{p_reward_id:rewardId});if(error)throw error;const value=data as {state:unknown};return {...value,state:normalizeCloudState(value.state)}}
