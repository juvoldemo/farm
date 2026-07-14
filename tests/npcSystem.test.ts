import { beforeEach, describe, expect, it } from 'vitest'
import { getNpcDialogue } from '../src/services/npcDialogueService'
import { createNpcFarmState, getNpcFarmState } from '../src/services/npcFarmService'
import { createNpcShopState } from '../src/services/npcShopService'
import { getNpcMovementState, getNpcStateAtTime, resolveNpcSchedule } from '../src/services/npcScheduleService'
import { migrateSaveGame } from '../src/services/saveMigrationService'
import { getGameSnapshot, useGameStore } from '../src/store/gameStore'

const at=(day:number,hour:number,minute=0)=>new Date(2026,6,day,hour,minute,0,0).getTime()
const setGameTime=(time:number)=>{useGameStore.setState({timeOffsetMs:time-Date.now()});useGameStore.getState().syncNpcStates(time)}

describe('lịch trình NPC theo timestamp',()=>{
 it('Cô Hoa ở tiệm lúc 08:00, nghỉ trưa lúc 12:00 và ngủ ban đêm',()=>{expect(resolveNpcSchedule('hoa',at(13,8)).locationId).toBe('hoa_shop');expect(resolveNpcSchedule('hoa',at(13,12)).activity).toBe('eating');expect(resolveNpcSchedule('hoa',at(13,22)).activity).toBe('sleeping')})
 it('cửa hàng mở đúng giờ và đóng lúc nghỉ trưa',()=>{expect(resolveNpcSchedule('hoa',at(13,8)).shopState).toBe('open');expect(resolveNpcSchedule('hoa',at(13,12)).shopState).toBe('closed')})
 it('di chuyển giữ đúng tiến độ khi gọi lại sau reload',()=>{const now=at(13,6,45),entry=resolveNpcSchedule('hoa',now),first=getNpcMovementState(entry,now),reloaded=getNpcMovementState(resolveNpcSchedule('hoa',now),now);expect(entry.activity).toBe('walking');expect(first?.progress).toBeCloseTo(.5);expect(reloaded).toEqual(first)})
 it('Chủ Nhật khác ngày thường',()=>{expect(resolveNpcSchedule('hoa',at(12,17)).locationId).toBe('village_square');expect(resolveNpcSchedule('hoa',at(13,17)).locationId).toBe('hoa_shop')})
 it('mưa chuyển Chú Ba từ ngoài đồng vào sửa dụng cụ',()=>{const sunny=resolveNpcSchedule('ba',at(13,7),'sunny'),rain=resolveNpcSchedule('ba',at(13,7),'rain');expect(sunny.locationId).toBe('ba_farm');expect(rain.locationId).toBe('ba_home');expect(rain.activity).toBe('repairing_tools')})
})

describe('hội thoại và thân thiết',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
 it('hội thoại sáng khác tối và mưa khác nắng',()=>{const morning=getNpcStateAtTime('hoa',at(13,8),'sunny'),night=getNpcStateAtTime('hoa',at(13,20,30),'sunny');expect(getNpcDialogue({npcId:'hoa',state:morning,weatherId:'sunny',friendshipLevel:0,now:at(13,8)}).text).not.toBe(getNpcDialogue({npcId:'hoa',state:night,weatherId:'sunny',friendshipLevel:0,now:at(13,20,30)}).text);expect(getNpcDialogue({npcId:'hoa',state:morning,weatherId:'rain',friendshipLevel:0,now:at(13,8)}).text).toMatch(/Mưa/)})
 it('cửa hàng đóng có hội thoại phù hợp',()=>{const state=getNpcStateAtTime('lan',at(13,15),'sunny');expect(getNpcDialogue({npcId:'lan',state,weatherId:'sunny',friendshipLevel:0,now:at(13,15)}).text).toMatch(/nghỉ|chuẩn bị/)})
 it('thân thiết cao mở hội thoại riêng',()=>{const state=getNpcStateAtTime('ba',at(13,9,30),'sunny');expect(getNpcDialogue({npcId:'ba',state,weatherId:'sunny',friendshipLevel:3,now:at(13,9,30)}).text).toMatch(/hạt tuyển/)})
 it('nói chuyện liên tục chỉ cộng điểm một lần mỗi ngày',()=>{setGameTime(at(13,8));const first=useGameStore.getState().talkToNpc('hoa'),second=useGameStore.getState().talkToNpc('hoa');expect(first.friendshipGained).toBe(5);expect(second.friendshipGained).toBe(0);expect(useGameStore.getState().npcRelationships.hoa.friendshipPoints).toBe(5)})
})

describe('giao dịch NPC an toàn',()=>{
 beforeEach(()=>{localStorage.clear();useGameStore.getState().resetGame()})
 it('không mua được khi đóng cửa',()=>{setGameTime(at(13,12));expect(()=>useGameStore.getState().purchaseFromNpc('hoa-general','hoa-cabbage')).toThrow(/nghỉ|đóng/)})
 it('không mua được khi chủ tiệm không có mặt',()=>{setGameTime(at(13,8));useGameStore.getState().devSetNpcLocation('hoa','village_square');expect(()=>useGameStore.getState().purchaseFromNpc('hoa-general','hoa-cabbage')).toThrow(/đường tới/)})
 it('mua trừ vàng, cộng vật phẩm và stock đúng một lần',()=>{setGameTime(at(13,8));const before=useGameStore.getState(),paid=before.purchaseFromNpc('hoa-general','hoa-cabbage'),after=useGameStore.getState();expect(paid).toBe(10);expect(after.player.gold).toBe(before.player.gold-10);expect(after.inventory.find(item=>item.id==='seed:cabbage')?.quantity).toBe(11);expect(after.npcShopStates['hoa-general'].purchased['hoa-cabbage']).toBe(1)})
 it('bán trừ nông sản và cộng vàng atomically',()=>{setGameTime(at(13,8));useGameStore.setState(state=>({inventory:[...state.inventory,{id:'produce:cabbage',itemType:'produce',referenceId:'cabbage',quantity:2}]}));const before=useGameStore.getState().player.gold,earned=useGameStore.getState().sellToNpc('hoa','cabbage',1);expect(useGameStore.getState().player.gold).toBe(before+earned);expect(useGameStore.getState().inventory.find(item=>item.id==='produce:cabbage')?.quantity).toBe(1)})
 it('giao dịch thất bại không đổi tiền hoặc kho',()=>{setGameTime(at(13,8));useGameStore.setState(state=>({player:{...state.player,gold:0}}));const before=getGameSnapshot();expect(()=>useGameStore.getState().purchaseFromNpc('hoa-general','hoa-cabbage')).toThrow(/Không đủ vàng/);const after=getGameSnapshot();expect(after.player.gold).toBe(before.player.gold);expect(after.inventory).toEqual(before.inventory)})
})

describe('offline, rotation và migration',()=>{
 it('NPC chuyển đúng hoạt động sau thời gian offline',()=>{const morning=getNpcStateAtTime('lan',at(13,7)),night=getNpcStateAtTime('lan',at(13,23));expect(morning.currentActivity).toBe('serving_customers');expect(night.currentActivity).toBe('sleeping')})
 it('cây NPC giữ timestamp và tiếp tục lớn',()=>{const morning=createNpcFarmState(at(13,7)),later=getNpcFarmState(morning,at(13,15));expect(later.plots.map(plot=>plot.plantedAt)).toEqual(morning.plots.map(plot=>plot.plantedAt));expect(later.plots.some(plot=>new Date(plot.readyAt).getTime()<=at(13,15))).toBe(true)})
 it('hàng trong ngày không random lại khi refresh',()=>{expect(createNpcShopState('hoa-general',at(13,8))).toEqual(createNpcShopState('hoa-general',at(13,17)))})
 it('save cũ được migrate mà không mất dữ liệu và có NPC mặc định',()=>{useGameStore.getState().resetGame();const current=getGameSnapshot(),legacy={...current,version:2,npcStates:undefined,npcRelationships:undefined,npcShopStates:undefined,npcFarmStates:undefined,dialogueProgress:undefined,activeFoodBuffs:undefined,lastNpcSyncAt:undefined,player:{...current.player,gold:1234}};const migrated=migrateSaveGame(legacy);expect(migrated.version).toBe(5);expect(migrated.player.gold).toBe(1234);expect(Object.keys(migrated.npcStates)).toEqual(['hoa','ba','lan']);expect(migrated.plots).toHaveLength(24)})
})
