import type { GameNotification } from '../types/database'
import { supabase } from './supabaseClient'
const client=()=>{if(!supabase)throw new Error('Supabase chưa được cấu hình.');return supabase}
export const loadNotifications=async(offset=0):Promise<GameNotification[]>=>{const {data,error}=await client().from('notifications').select('id,type,title,message,sender_id,is_read,reference_id,created_at').order('created_at',{ascending:false}).range(offset,offset+19);if(error)throw error;return(data??[]).map(n=>({id:n.id,type:n.type,title:n.title,message:n.message,senderId:n.sender_id,isRead:n.is_read,referenceId:n.reference_id,createdAt:n.created_at}))}
export const markNotificationRead=async(id:string)=>{const {error}=await client().from('notifications').update({is_read:true}).eq('id',id);if(error)throw error}
export const markAllNotificationsRead=async()=>{const {error}=await client().from('notifications').update({is_read:true}).eq('is_read',false);if(error)throw error}
