import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HarvestInteractionCoordinator, withHarvestTimeout } from '../src/services/harvestInteractionService'
import { useGameStore } from '../src/store/gameStore'
import { crops } from '../src/config/crops'

describe('điều phối thu hoạch nhanh theo từng ô',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})

 it('khóa đúng một ô và không gửi request/cộng thưởng trùng',async()=>{
  const coordinator=new HarvestInteractionCoordinator(),resolve:{current?:(value:number)=>void}={},request=vi.fn(()=>new Promise<number>(done=>{resolve.current=done})),success=vi.fn(),rollback=vi.fn()
  const first=coordinator.run({plotId:'plot-1',request,onStart:vi.fn(),onSuccess:success,onRollback:rollback})
  const duplicate=await coordinator.run({plotId:'plot-1',request,onStart:vi.fn(),onSuccess:success,onRollback:rollback})
  expect(duplicate).toBe(false);expect(request).toHaveBeenCalledTimes(1);resolve.current?.(6);expect(await first).toBe(true);expect(success).toHaveBeenCalledOnce();expect(rollback).not.toHaveBeenCalled()
 })

 it('cho phép nhiều ô khác nhau chạy song song độc lập',async()=>{
  const coordinator=new HarvestInteractionCoordinator(),pending=new Map<string,(value:string)=>void>(),completed:string[]=[]
  const run=(plotId:string)=>coordinator.run({plotId,request:()=>new Promise<string>(resolve=>pending.set(plotId,resolve)),onStart:vi.fn(),onSuccess:value=>completed.push(value),onRollback:vi.fn()})
  const a=run('plot-1'),b=run('plot-2');expect(coordinator.activePlotIds()).toEqual(new Set(['plot-1','plot-2']));pending.get('plot-2')?.('plot-2');pending.get('plot-1')?.('plot-1');await Promise.all([a,b]);expect(completed.sort()).toEqual(['plot-1','plot-2'])
 })

 it('rollback và mở khóa riêng ô khi API lỗi',async()=>{
  const coordinator=new HarvestInteractionCoordinator(),rollback=vi.fn(),success=vi.fn(),started=vi.fn()
  const result=await coordinator.run({plotId:'plot-3',request:async()=>{throw new Error('NETWORK')},onStart:started,onSuccess:success,onRollback:rollback})
  expect(result).toBe(false);expect(started).toHaveBeenCalledOnce();expect(rollback).toHaveBeenCalledOnce();expect(success).not.toHaveBeenCalled();expect(coordinator.isActive('plot-3')).toBe(false)
 })

 it('timeout hoàn tất bằng lỗi để UI có thể khôi phục cây',async()=>{vi.useFakeTimers();const result=withHarvestTimeout(new Promise<number>(()=>{}),50),assertion=expect(result).rejects.toThrow('HARVEST_TIMEOUT');await vi.advanceTimersByTimeAsync(51);await assertion;vi.useRealTimers()})

 it('thu hoạch hai cây chín liên tiếp cộng kho và XP đúng một lần mỗi cây',async()=>{
  const store=useGameStore.getState();store.plantCrop('plot-1','cabbage');store.plantCrop('plot-2','cabbage');store.devFinishCrops();const coordinator=new HarvestInteractionCoordinator()
  const harvest=(plotId:string)=>coordinator.run({plotId,request:async()=>useGameStore.getState().harvestCrop(plotId),onStart:vi.fn(),onSuccess:vi.fn(),onRollback:vi.fn()})
  await Promise.all([harvest('plot-1'),harvest('plot-2')]);const state=useGameStore.getState(),quantity=state.inventory.find(item=>item.itemType==='produce'&&item.referenceId==='cabbage')?.quantity??0
  expect(quantity).toBeGreaterThanOrEqual(crops[0].minHarvestQuantity*2);expect(state.player.currentXp).toBe(crops[0].xpReward*2);expect(state.plots[0].cropInstance).toBeUndefined();expect(state.plots[1].cropInstance).toBeUndefined()
 })
})
