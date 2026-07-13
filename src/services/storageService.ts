import type { GameStateData } from '../types/game'
export const GAME_SAVE_KEY = 'happy-farm-save-v1'
export const saveGameState = (state: GameStateData) => localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(state))
export const loadGameState = (): GameStateData | null => {
  try { const raw = localStorage.getItem(GAME_SAVE_KEY); return raw ? JSON.parse(raw) as GameStateData : null }
  catch { return null }
}
export const clearGameState = () => localStorage.removeItem(GAME_SAVE_KEY)
export const syncOfflineProgress = (state: GameStateData, now = Date.now()) => ({
  elapsedSeconds:Math.max(0,Math.floor((now-new Date(state.player.lastLoginAt).getTime())/1000)),
  readyCrops:state.plots.filter(plot => plot.cropInstance && new Date(plot.cropInstance.readyAt).getTime() <= now).length,
})
