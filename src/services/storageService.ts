import type { GameStateData } from '../types/game'
import { backupSaveGame, migrateSaveGame } from './saveMigrationService'
export const GAME_SAVE_KEY = 'happy-farm-save-v1'
export const saveGameState = (state: GameStateData) => localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(state))
export const loadGameState = (): GameStateData | null => {
  const raw=localStorage.getItem(GAME_SAVE_KEY);if(!raw)return null
  try { return migrateSaveGame(JSON.parse(raw)) }
  catch { backupSaveGame(raw); return null }
}
export const clearGameState = () => localStorage.removeItem(GAME_SAVE_KEY)
export const syncOfflineProgress = (state: GameStateData, now = Date.now()) => ({
  elapsedSeconds:Math.max(0,Math.floor((now-new Date(state.player.lastLoginAt).getTime())/1000)),
  readyCrops:state.plots.filter(plot => plot.cropInstance && new Date(plot.cropInstance.readyAt).getTime() <= now).length,
})
