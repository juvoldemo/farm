import type { GameStateData } from '../types/game'
import { supabase } from './supabaseClient'

interface CloudSaveRow {
  user_id: string
  state: GameStateData
  save_version: number
  last_saved_at: string
  updated_at: string
}

const requireClient = () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.')
  return supabase
}

const validateState = (value: unknown): value is GameStateData => {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<GameStateData>
  return state.version === 1 && Boolean(state.player) && Array.isArray(state.plots)
    && state.plots.length === 24 && Array.isArray(state.inventory) && Boolean(state.stats)
}

export const loadCloudGame = async (userId: string): Promise<GameStateData | null> => {
  const { data, error } = await requireClient()
    .from('game_saves')
    .select('user_id,state,save_version,last_saved_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle<CloudSaveRow>()
  if (error) throw error
  if (!data) return null
  if (!validateState(data.state)) throw new Error('Bản lưu cloud không hợp lệ hoặc không tương thích.')
  return data.state
}

export const saveCloudGame = async (userId: string, state: GameStateData): Promise<string> => {
  const savedAt = new Date().toISOString()
  const { data, error } = await requireClient()
    .from('game_saves')
    .upsert({ user_id:userId, state, save_version:state.version, last_saved_at:savedAt }, { onConflict:'user_id' })
    .select('updated_at')
    .single<{ updated_at:string }>()
  if (error) throw error
  return data.updated_at
}
