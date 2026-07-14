import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Dna, FlaskConical, HelpCircle } from 'lucide-react'
import { hybridRecipes } from '../config/hybridRecipes'
import { rarityConfig, traitDefinitions } from '../config/geneticsConfig'
import { cropById } from '../config/crops'
import { useGameStore } from '../store/gameStore'
import type { CropTrait, SeedRarity } from '../types/game'
import { Modal } from './Modal'
import { claimPendingSeed, loadPendingSeedRewards } from '../services/geneticsApi'

export function TraitBadges({traits,compact=false}:{traits:CropTrait[];compact?:boolean}){return <div className={`trait-badges ${compact?'compact':''}`}>{traits.map(trait=>{const def=traitDefinitions[trait.traitId];return <span key={trait.traitId} title={`${def.name} cấp ${trait.level}: ${def.description}`}>{trait.discovered?def.icon:'❔'}{!compact&&<>{def.name} <b>{'III'.slice(0,trait.level)}</b></>}</span>})}</div>}
export function RarityLabel({rarity}:{rarity:SeedRarity}){const item=rarityConfig[rarity];return <span className="rarity-label" style={{color:item.color,borderColor:item.color}}>{item.name}</span>}

type Filter='all'|'discovered'|'unknown'|'same'|'cross'
export function HybridJournalPanel({open,onClose}:{open:boolean;onClose:()=>void}){
 const discoveries=useGameStore(s=>s.hybridDiscoveries),replaceGameData=useGameStore(s=>s.replaceGameData),[filter,setFilter]=useState<Filter>('all'),[pending,setPending]=useState<Awaited<ReturnType<typeof loadPendingSeedRewards>>>([]),known=new Map(discoveries.map(d=>[d.recipeId,d]))
 useEffect(()=>{if(open)void loadPendingSeedRewards().then(setPending).catch(()=>setPending([]))},[open])
 const claim=async(id:string)=>{try{const result=await claimPendingSeed(id);replaceGameData(result.state);setPending(items=>items.filter(item=>item.id!==id));toast.success('Đã nhận hạt giống đang chờ!')}catch(error){toast.error(error instanceof Error?error.message:'Chưa thể nhận hạt')}}
 const recipes=useMemo(()=>hybridRecipes.filter(r=>filter==='all'||filter==='discovered'&&known.has(r.id)||filter==='unknown'&&!known.has(r.id)||filter==='same'&&r.parentCropAId===r.parentCropBId||filter==='cross'&&r.parentCropAId!==r.parentCropBId),[filter,discoveries])
 return <Modal open={open} title="Sổ lai giống" onClose={onClose} wide><div className="hybrid-summary"><Dna/><div><b>{discoveries.length}/{hybridRecipes.length} công thức</b><span>Hãy trồng cây tương thích cạnh nhau và thu hoạch.</span></div></div>{pending.length>0&&<section className="pending-seeds"><h3>📬 Hạt đang chờ ({pending.length})</h3>{pending.map(reward=>{const seed=reward.seed_instances,crop=cropById(seed.crop_id);return <button key={reward.id} onClick={()=>void claim(reward.id)}><span>{crop?.icon??'🌱'}</span><div><b>{crop?.name}</b><small>{seed.rarity} · G{seed.generation}</small></div><strong>Nhận hạt</strong></button>})}</section>}<div className="hybrid-filters">{([['all','Tất cả'],['discovered','Đã khám phá'],['unknown','Chưa khám phá'],['same','Cùng loại'],['cross','Khác loại']] as const).map(([id,label])=><button className={filter===id?'active':''} onClick={()=>setFilter(id)} key={id}>{label}</button>)}</div><div className="hybrid-grid">{recipes.map(recipe=>{const discovery=known.get(recipe.id),a=cropById(recipe.parentCropAId),b=cropById(recipe.parentCropBId),result=cropById(recipe.resultCropId);return <article className={discovery?'known':'unknown'} key={recipe.id}>{discovery?<><div className="hybrid-icons"><span>{a?.icon}</span><b>＋</b><span>{b?.icon}</span><b>→</b><span>{result?.icon}</span></div><h3>{recipe.displayName}</h3><RarityLabel rarity={recipe.resultRarity}/><p>{recipe.description}</p><small>Đã tạo {discovery.totalCreated} · Cao nhất G{discovery.highestGeneration}</small></>:<><HelpCircle/><h3>Giống chưa biết</h3><p>{recipe.hint}</p><small>??? + ???</small></>}</article>})}</div>{!recipes.length&&<div className="empty-state"><FlaskConical/><b>Chưa có công thức phù hợp bộ lọc</b></div>}</Modal>
}
