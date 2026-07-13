export const formatRemainingTime = (seconds: number): string => {
  const safe = Math.max(0, Math.ceil(seconds))
  const days = Math.floor(safe / 86400)
  const hours = Math.floor((safe % 86400) / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  if (days) return `${days}n ${hours}g`
  if (hours) return `${hours}g ${minutes}p`
  if (minutes) return `${minutes}p ${secs.toString().padStart(2,'0')}s`
  return `${secs}s`
}
export const formatDuration = (seconds: number) => formatRemainingTime(seconds)
