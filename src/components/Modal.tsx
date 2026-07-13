import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({open,title,onClose,children,wide=false}:{open:boolean;title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
  useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[open])
  if(typeof document==='undefined')return null
  return createPortal(<AnimatePresence>{open&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <motion.section className={`modal-card ${wide?'modal-wide':''}`} initial={{y:40,scale:.96,opacity:0}} animate={{y:0,scale:1,opacity:1}} exit={{y:30,scale:.97,opacity:0}} transition={{type:'spring',damping:24}}>
      <header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={22}/></button></header>
      <div className="modal-body">{children}</div>
    </motion.section>
  </motion.div>}</AnimatePresence>,document.body)
}
