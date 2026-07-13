export const xpForLevel = (level: number) => 100 + (level - 1) * 60
export const calculatePlayerLevel = (level: number, currentXp: number, gainedXp: number) => {
  let nextLevel = level, xp = currentXp + gainedXp, levelsGained = 0
  while (xp >= xpForLevel(nextLevel)) { xp -= xpForLevel(nextLevel); nextLevel++; levelsGained++ }
  return { level:nextLevel, currentXp:xp, levelsGained }
}
