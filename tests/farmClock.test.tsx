import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameClock } from '../src/hooks/useGameClock'

;(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true

function ClockProbe({name}:{name:string}) {
  const now=useGameClock()
  return <output data-clock={name}>{now}</output>
}

afterEach(()=>{
  vi.restoreAllMocks()
  vi.useRealTimers()
  Reflect.deleteProperty(document,'visibilityState')
})

describe('shared farm clock',()=>{
  it('uses one interval for multiple plot subscribers',async()=>{
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'))
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
    const intervalSpy=vi.spyOn(window,'setInterval')
    const host=document.createElement('div'),root=createRoot(host)

    try {
      await act(async()=>{root.render(<><ClockProbe name="one"/><ClockProbe name="two"/></>)})
      expect(intervalSpy).toHaveBeenCalledTimes(1)
      const before=host.querySelector('[data-clock="one"]')?.textContent
      await act(async()=>{await vi.advanceTimersByTimeAsync(1000)})
      expect(host.querySelector('[data-clock="one"]')?.textContent).not.toBe(before)
      expect(intervalSpy).toHaveBeenCalledTimes(1)
    } finally {
      await act(async()=>{root.unmount()})
    }
  })

  it('pauses while hidden and recalculates immediately when the tab returns',async()=>{
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'))
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
    const host=document.createElement('div'),root=createRoot(host)

    try {
      await act(async()=>{root.render(<ClockProbe name="visibility"/>)})
      expect(vi.getTimerCount()).toBe(1)

      Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'})
      await act(async()=>{document.dispatchEvent(new Event('visibilitychange'))})
      expect(vi.getTimerCount()).toBe(0)

      vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))
      Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
      await act(async()=>{document.dispatchEvent(new Event('visibilitychange'))})
      expect(host.querySelector('[data-clock="visibility"]')?.textContent).toBe(String(Date.now()))
      expect(vi.getTimerCount()).toBe(1)
    } finally {
      await act(async()=>{root.unmount()})
    }
  })
})
