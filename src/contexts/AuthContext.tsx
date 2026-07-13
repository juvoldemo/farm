import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { loadCloudGame, saveCloudGame } from '../services/cloudSaveService'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'
import { getGameSnapshot, useGameStore } from '../store/gameStore'

export type SyncStatus = 'disabled' | 'loading' | 'saving' | 'synced' | 'offline' | 'error'
interface AuthContextValue {
  configured:boolean; session:Session|null; status:SyncStatus; lastSyncedAt:string|null; syncError:string|null
  signIn:(email:string,password:string)=>Promise<void>
  signUp:(email:string,password:string)=>Promise<boolean>
  signOut:()=>Promise<void>; syncNow:()=>Promise<void>
}

const AuthContext=createContext<AuthContextValue|null>(null)
const CLOUD_OWNER_KEY='happy-farm-cloud-owner'

export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[status,setStatus]=useState<SyncStatus>(isSupabaseConfigured?'loading':'disabled'),[lastSyncedAt,setLastSyncedAt]=useState<string|null>(null),[syncError,setSyncError]=useState<string|null>(null)
 const activeUser=useRef<string|null>(null),ready=useRef(false),timer=useRef<number|undefined>(undefined),syncing=useRef(false),dirty=useRef(false)

 const persist=useCallback(async()=>{
   const userId=activeUser.current
   if(!userId||!ready.current)return
   if(syncing.current){dirty.current=true;return}
   if(!navigator.onLine){setStatus('offline');return}
   syncing.current=true;dirty.current=false;setStatus('saving');setSyncError(null)
   try{const updatedAt=await saveCloudGame(userId,getGameSnapshot());localStorage.setItem(CLOUD_OWNER_KEY,userId);setLastSyncedAt(updatedAt);setStatus('synced')}
   catch(error){setSyncError(error instanceof Error?error.message:'Không thể lưu cloud.');setStatus(navigator.onLine?'error':'offline')}
   finally{syncing.current=false;if(dirty.current&&activeUser.current)timer.current=window.setTimeout(()=>void persist(),250)}
 },[])

 const initializeUser=useCallback(async(userId:string)=>{
   activeUser.current=userId;ready.current=false;setStatus('loading');setSyncError(null)
   try{
     const cloud=await loadCloudGame(userId)
     if(cloud){useGameStore.getState().replaceGameData(cloud);localStorage.setItem(CLOUD_OWNER_KEY,userId)}
     else if(localStorage.getItem(CLOUD_OWNER_KEY)&&localStorage.getItem(CLOUD_OWNER_KEY)!==userId)useGameStore.getState().resetGame()
     ready.current=true
     if(!cloud)await persist();else{setStatus('synced');setLastSyncedAt(new Date().toISOString())}
   }catch(error){ready.current=true;setSyncError(error instanceof Error?error.message:'Không thể tải bản lưu cloud.');setStatus(navigator.onLine?'error':'offline')}
 },[persist])

 useEffect(()=>{
   if(!supabase)return
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
     setSession(next)
     if(next?.user.id&&next.user.id!==activeUser.current)void initializeUser(next.user.id)
     if(!next){activeUser.current=null;ready.current=false;setStatus('synced');setLastSyncedAt(null)}
   })
   return()=>subscription.unsubscribe()
 },[initializeUser])

 useEffect(()=>useGameStore.subscribe(()=>{
   if(!activeUser.current||!ready.current)return
   dirty.current=true;window.clearTimeout(timer.current);setStatus('saving')
   timer.current=window.setTimeout(()=>void persist(),900)
 }),[persist])

 useEffect(()=>{const online=()=>{if(activeUser.current)void persist()};const offline=()=>activeUser.current&&setStatus('offline');window.addEventListener('online',online);window.addEventListener('offline',offline);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline)}},[persist])

 const signIn=async(email:string,password:string)=>{if(!supabase)throw new Error('Supabase chưa được cấu hình.');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
 const signUp=async(email:string,password:string)=>{if(!supabase)throw new Error('Supabase chưa được cấu hình.');const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;return Boolean(data.session)}
 const signOut=async()=>{if(!supabase)return;await persist();const {error}=await supabase.auth.signOut();if(error)throw error}

 return <AuthContext.Provider value={{configured:isSupabaseConfigured,session,status,lastSyncedAt,syncError,signIn,signUp,signOut,syncNow:persist}}>{children}</AuthContext.Provider>
}

export const useAuth=()=>{const value=useContext(AuthContext);if(!value)throw new Error('useAuth phải được dùng trong AuthProvider.');return value}
