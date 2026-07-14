import type { GameStateData } from '../types/game'
import { migrateSaveGame, validateSaveGame } from './saveMigrationService'
import { supabase } from './supabaseClient'

interface CloudSaveRow {
  user_id: string
  state: GameStateData
  save_version: number
  last_saved_at: string
  updated_at: string
}

export interface CloudGame {
  state: GameStateData
  updatedAt: string
}

export class CloudSaveConflictError extends Error {
  constructor(){super('Bản lưu cloud đã được cập nhật trên một thiết bị khác.');this.name='CloudSaveConflictError'}
}

const requireClient = () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.')
  return supabase
}

export const normalizeCloudState = (value: unknown): GameStateData => {
  if(!validateSaveGame(value))throw new Error('Bản lưu cloud không hợp lệ hoặc không tương thích.')
  return migrateSaveGame(value)
}

export const loadCloudGame = async (userId: string): Promise<CloudGame | null> => {
  const { data, error } = await requireClient()
    .from('game_saves')
    .select('user_id,state,save_version,last_saved_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle<CloudSaveRow>()
  if (error) throw error
  if (!data) return null
  return {state:normalizeCloudState(data.state),updatedAt:data.updated_at}
}

export const saveCloudGame = async (userId: string, state: GameStateData, expectedUpdatedAt?:string): Promise<string> => {
  const savedAt = new Date().toISOString()
  const table=requireClient().from('game_saves')
  const query=expectedUpdatedAt
    ?table.update({state,save_version:state.version,last_saved_at:savedAt}).eq('user_id',userId).eq('updated_at',expectedUpdatedAt)
    :table.upsert({user_id:userId,state,save_version:state.version,last_saved_at:savedAt},{onConflict:'user_id'})
  const {data,error}=await query.select('updated_at').maybeSingle<{updated_at:string}>()
  if (error) throw error
  if(!data)throw new CloudSaveConflictError()
  const {error:profileError}=await requireClient().rpc('refresh_public_progress')
  if(profileError&&import.meta.env.DEV)console.error('Không thể cập nhật hồ sơ công khai:',profileError)
  return data.updated_at
}
