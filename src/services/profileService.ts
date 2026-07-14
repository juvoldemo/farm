import type { PlayerProfile } from '../types/database'
import { supabase } from './supabaseClient'
const client=()=>{if(!supabase)throw new Error('Supabase chưa được cấu hình.');return supabase}
const map=(p:Record<string,unknown>):PlayerProfile=>({id:String(p.id),username:String(p.username),displayName:String(p.display_name),playerCode:String(p.player_code),avatarUrl:p.avatar_url?String(p.avatar_url):null,level:Number(p.level),status:p.status==='online'?'online':'offline',lastOnlineAt:String(p.last_online_at),createdAt:p.created_at?String(p.created_at):undefined})
export const loadProfile=async(id:string)=>{const {data,error}=await client().from('profiles').select('id,username,display_name,player_code,avatar_url,level,status,last_online_at,created_at').eq('id',id).single();if(error)throw error;return map(data)}
export const updateProfile=async(id:string,value:{displayName:string;avatarUrl?:string|null})=>{const {error}=await client().from('profiles').update({display_name:value.displayName.trim(),avatar_url:value.avatarUrl??null}).eq('id',id);if(error)throw error;return loadProfile(id)}
export const touchOnline=async()=>{await client().rpc('touch_online')}
export {map as mapProfile}
