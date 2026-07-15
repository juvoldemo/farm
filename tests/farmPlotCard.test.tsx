import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FarmPlotCard } from '../src/components/FarmPlotCard'
import type { CropInstance, FarmPlot } from '../src/types/game'

;(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true

const cropInstance = (readyAt: string): CropInstance => ({
  id:'crop-test',
  cropId:'cabbage',
  plotId:'plot-1',
  plantedAt:new Date(Date.now()-30_000).toISOString(),
  readyAt,
  baseGrowthDuration:60,
  totalReductionSeconds:0,
  fertilizerUsage:[],
  lastCalculatedAt:new Date().toISOString(),
})

const plot = (value: Partial<FarmPlot> = {}): FarmPlot => ({
  id:'plot-1',
  plotNumber:1,
  isUnlocked:true,
  unlockPrice:0,
  requiredLevel:1,
  ...value,
})

describe('FarmPlotCard accessibility states', () => {
  it('describes a locked plot with its price and required level', () => {
    const html=renderToStaticMarkup(<FarmPlotCard plot={plot({plotNumber:8,isUnlocked:false,unlockPrice:13_500,requiredLevel:7})}/>)
    expect(html).toContain('Ô đất số 8 đang khóa')
    expect(html).toContain('13.500 vàng')
    expect(html).toContain('yêu cầu cấp 7')
  })

  it('keeps an empty plot as a native keyboard button', () => {
    const html=renderToStaticMarkup(<FarmPlotCard plot={plot()}/>)
    expect(html).toContain('<button')
    expect(html).toContain('nhấn để trồng cây')
  })

  it('announces a mature crop as a one-tap harvest action', () => {
    const html=renderToStaticMarkup(<FarmPlotCard plot={plot({cropInstance:cropInstance(new Date(Date.now()-1000).toISOString())})}/>)
    expect(html).toContain('cây Cải xanh đã trưởng thành')
    expect(html).toContain('nhấn để thu hoạch')
  })

  it('renders a legacy crop even when fertilizer history is missing', () => {
    const legacy={...cropInstance(new Date(Date.now()+30_000).toISOString()),fertilizerUsage:undefined} as unknown as CropInstance
    expect(()=>renderToStaticMarkup(<FarmPlotCard plot={plot({cropInstance:legacy})}/>)).not.toThrow()
  })

  it('keeps keyboard focus when a harvested plot becomes empty', async () => {
    const host=document.createElement('div')
    document.body.appendChild(host)
    const root=createRoot(host)

    try {
      await act(async()=>root.render(<FarmPlotCard plot={plot({cropInstance:cropInstance(new Date(Date.now()-1000).toISOString())})} reducedMotion/>))
      const matureButton=host.querySelector<HTMLButtonElement>('button[data-plot-number="1"]')
      matureButton?.focus()
      expect(document.activeElement).toBe(matureButton)

      await act(async()=>root.render(<FarmPlotCard plot={plot()} harvestFeedback={{quantity:3,cropName:'Cải xanh',xp:4,phase:'confirmed'}} reducedMotion/>))
      expect(document.activeElement).toBe(host.querySelector('button[data-plot-number="1"]'))
    } finally {
      await act(async()=>root.unmount())
      host.remove()
    }
  })
})
