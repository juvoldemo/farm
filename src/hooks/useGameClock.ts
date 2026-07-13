import { useEffect, useState } from 'react'
export const useGameClock = (offsetMs = 0) => {
  const [now,setNow]=useState(()=>Date.now()+offsetMs)
  useEffect(()=>{setNow(Date.now()+offsetMs);const id=window.setInterval(()=>setNow(Date.now()+offsetMs),1000);return()=>clearInterval(id)},[offsetMs])
  return now
}
