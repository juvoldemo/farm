import { useMemo, useState } from 'react'
import { crops } from '../config/crops'
import { plotUnlockConfig } from '../config/plotUnlockConfig'
import { formatNumber } from '../utils/currency'
import { formatDuration } from '../utils/time'
import { getCropEconomy, simulateCropIncome, validateCropEconomy } from '../utils/cropEconomy'
import { Modal } from './Modal'

type Sort='level'|'time'|'profit'
export function EconomyDebugPanel({open,onClose}:{open:boolean;onClose:()=>void}){
 const [sort,setSort]=useState<Sort>('level'),warnings=useMemo(()=>validateCropEconomy(crops),[])
 const rows=useMemo(()=>[...crops].sort((a,b)=>sort==='time'?a.growthDurationSeconds-b.growthDurationSeconds:sort==='profit'?getCropEconomy(b).profitPerHour-getCropEconomy(a).profitPerHour:a.requiredLevel-b.requiredLevel),[sort])
 const reference=crops.at(-1)!,plotCounts=[3,6,12,18,24]
 return <Modal open={open} title="Debug nền kinh tế" onClose={onClose} wide><section className="economy-debug">
  <header><b>{warnings.length?`${warnings.length} cảnh báo`:'✓ Cấu hình hợp lệ'}</b><div>{(['level','time','profit'] as const).map(value=><button className={sort===value?'active':''} onClick={()=>setSort(value)} key={value}>{value==='level'?'Cấp':value==='time'?'Thời gian':'Lãi/giờ'}</button>)}</div></header>
  <div className="economy-table"><table><thead><tr><th>Cây</th><th>Cấp</th><th>Thời gian</th><th>Hạt</th><th>SL kỳ vọng</th><th>Giá bán</th><th>Doanh thu</th><th>Lợi nhuận</th><th>Lãi/giờ</th><th>Tỷ lệ hạt</th><th>Nhóm</th></tr></thead><tbody>{rows.map(crop=>{const e=getCropEconomy(crop),alert=warnings.some(w=>w.cropId===crop.id);return <tr className={alert?'alert':''} key={crop.id}><td>{crop.icon} {crop.name}</td><td>{crop.requiredLevel}</td><td>{formatDuration(crop.growthDurationSeconds)}</td><td>{formatNumber(crop.seedPrice)}</td><td>{e.averageYield.toFixed(2)}</td><td>{formatNumber(crop.sellPrice)}</td><td>{formatNumber(Math.round(e.averageRevenue))}</td><td>{formatNumber(Math.round(e.averageProfit))}</td><td>{e.profitPerHour.toFixed(1)}</td><td>{(e.seedCostRatio*100).toFixed(1)}%</td><td>{crop.economyTier}</td></tr>})}</tbody></table></div>
  {warnings.length>0&&<ul>{warnings.map((warning,index)=><li key={`${warning.cropId}-${index}`}>{warning.cropId}: {warning.message}</li>)}</ul>}
  <h3>Mô phỏng cây cấp cao nhất</h3><div className="simulation-grid">{plotCounts.map(count=>{const day=simulateCropIncome(reference,count),week=simulateCropIncome(reference,count,7),month=simulateCropIncome(reference,count,30),next=plotUnlockConfig[count]?.price;return <article key={count}><b>{count} ô</b><span>Gieo: {formatNumber(day.seedCost)}</span><span>Lãi/chu kỳ: {formatNumber(Math.round(day.profitPerCycle))}</span><span>1 ngày: {formatNumber(Math.round(day.profit))}</span><span>7 ngày: {formatNumber(Math.round(week.profit))}</span><span>30 ngày: {formatNumber(Math.round(month.profit))}</span>{next&&<span>Ô kế: {(next/day.profit).toFixed(1)} ngày</span>}</article>})}</div>
 </section></Modal>
}

export function EconomyDebugLauncher(){const [open,setOpen]=useState(false);return <><button className="economy-debug-launcher" onClick={()=>setOpen(true)}>📊 Kinh tế</button><EconomyDebugPanel open={open} onClose={()=>setOpen(false)}/></>}
