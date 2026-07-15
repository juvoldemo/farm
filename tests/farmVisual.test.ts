import { describe, expect, it } from 'vitest'
import { crops } from '../src/config/crops'
import { cropVisualConfig, getCropVisualConfig, getCropVisualStage } from '../src/config/cropVisualConfig'

describe('farm visual mapping', () => {
  it('has a centralized visual definition for every existing crop', () => {
    expect(crops.map(crop=>crop.id).filter(cropId=>!(cropId in cropVisualConfig))).toEqual([])
  })

  it.each([
    [0,false,'seed'],
    [15,false,'sprout'],
    [35,false,'young'],
    [60,false,'growing'],
    [90,false,'mature'],
    [100,true,'harvestable'],
  ] as const)('maps %s%% ready=%s to %s without changing gameplay data', (percent,ready,stage) => {
    expect(getCropVisualStage(percent,ready)).toBe(stage)
  })

  it('falls back safely when an old or unknown crop has no dedicated asset', () => {
    expect(getCropVisualConfig('legacy-crop').harvestable.fruitGlyph).toBeTruthy()
  })
})
