import { useSyncExternalStore } from 'react'

type ClockListener = () => void

const listeners = new Set<ClockListener>()
let clockNow = Date.now()
let clockTimer: number | undefined

const emitTick = () => {
  clockNow = Date.now()
  listeners.forEach(listener => listener())
}

const stopClock = () => {
  window.clearInterval(clockTimer)
  clockTimer = undefined
}

const startClock = () => {
  stopClock()
  if (document.visibilityState !== 'hidden') clockTimer = window.setInterval(emitTick, 1000)
}

const handleVisibilityChange = () => {
  emitTick()
  startClock()
}

const subscribe = (listener: ClockListener) => {
  listeners.add(listener)
  if (listeners.size === 1) {
    clockNow = Date.now()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    startClock()
  }

  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      stopClock()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}

const getSnapshot = () => clockNow

/** One shared real-time clock for every farm subscriber. */
export const useGameClock = (offsetMs = 0) =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot) + offsetMs

/** Shared clock sampled by a coarse bucket so large parents do not update every second. */
export const useGameClockBucket = (offsetMs = 0, bucketMs = 60_000) => {
  const safeBucketMs = Math.max(1000,bucketMs)
  const getBucketSnapshot = () => Math.floor((clockNow+offsetMs)/safeBucketMs)
  return useSyncExternalStore(subscribe,getBucketSnapshot,getBucketSnapshot)*safeBucketMs
}

/** Subscribe to a primitive derived from the shared clock; React updates only when it changes. */
export const useGameClockValue = <Value extends string|number|boolean>(selector: (now: number) => Value) => {
  const getValueSnapshot = () => selector(clockNow)
  return useSyncExternalStore(subscribe,getValueSnapshot,getValueSnapshot)
}
