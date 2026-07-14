import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CloudSaveConflictError, loadCloudGame, saveCloudGame } from '../services/cloudSaveService'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'
import { getGameSnapshot, useGameStore } from '../store/gameStore'
import type { PlayerProfile } from '../types/database'
import { loadProfile, touchOnline, updateProfile as saveProfile } from '../services/profileService'
import { registerPlayer, requestPasswordReset, signInWithEmail } from '../services/authService'

export type SyncStatus = 'disabled' | 'loading' | 'saving' | 'synced' | 'offline' | 'error'
interface AuthContextValue {
  configured:boolean; authReady:boolean; legacyImportRequired:boolean; session:Session|null; profile:PlayerProfile|null; status:SyncStatus; lastSyncedAt:string|null; syncError:string|null
  signIn:(email:string,password:string)=>Promise<void>
  signUp:(input:{email:string;password:string;username:string;displayName:string})=>Promise<boolean>
  resetPassword:(email:string)=>Promise<void>;updateProfile:(value:{displayName:string;avatarUrl?:string|null})=>Promise<void>
  resolveLegacyImport:(shouldImport:boolean)=>Promise<void>;signOut:()=>Promise<void>; syncNow:()=>Promise<void>
}

const AuthContext=createContext<AuthContextValue|null>(null)
const CLOUD_OWNER_KEY='happy-farm-cloud-owner'

export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[status,setStatus]=useState<SyncStatus>(isSupabaseConfigured?'loading':'disabled'),[lastSyncedAt,setLastSyncedAt]=useState<string|null>(null),[syncError,setSyncError]=useState<string|null>(null)
 const [authReady,setAuthReady]=useState(!isSupabaseConfigured),[profile,setProfile]=useState<PlayerProfile|null>(null)
 const [legacyImportRequired,setLegacyImportRequired]=useState(false)
 const activeUser=useRef<string|null>(null),ready=useRef(false),timer=useRef<number|undefined>(undefined),syncing=useRef(false),dirty=useRef(false),applyingRemote=useRef(false),pendingLegacy=useRef<ReturnType<typeof getGameSnapshot>|null>(null)

 const applyRemote=useCallback((state:ReturnType<typeof getGameSnapshot>)=>{
   applyingRemote.current=true
   useGameStore.getState().replaceGameData(state)
   applyingRemote.current=false
 },[])

 const persist=useCallback(async()=>{
   const userId=activeUser.current
   if(!userId||!ready.current)return
   if(syncing.current){dirty.current=true;return}
   if(!navigator.onLine){setStatus('offline');return}
   syncing.current=true;dirty.current=false;setStatus('saving');setSyncError(null)
   try{
     let completed=false
     for(let attempt=0;attempt<2&&!completed;attempt++){
       const local=getGameSnapshot(),cloud=await loadCloudGame(userId)
       if(cloud&&new Date(cloud.state.lastSavedAt).getTime()>new Date(local.lastSavedAt).getTime()){
         applyRemote(cloud.state);localStorage.setItem(CLOUD_OWNER_KEY,userId);setLastSyncedAt(cloud.updatedAt);completed=true;break
       }
       if(cloud&&JSON.stringify(cloud.state)===JSON.stringify(local)){
         localStorage.setItem(CLOUD_OWNER_KEY,userId);setLastSyncedAt(cloud.updatedAt);completed=true;break
       }
       try{
         const updatedAt=await saveCloudGame(userId,local,cloud?.updatedAt)
         localStorage.setItem(CLOUD_OWNER_KEY,userId);setLastSyncedAt(updatedAt);completed=true
       }catch(error){if(!(error instanceof CloudSaveConflictError)||attempt===1)throw error}
     }
     setStatus('synced')
   }
   catch(error){setSyncError(error instanceof Error?error.message:'Không thể lưu cloud.');setStatus(navigator.onLine?'error':'offline')}
   finally{syncing.current=false;if(dirty.current&&activeUser.current)timer.current=window.setTimeout(()=>void persist(),250)}
 },[applyRemote])

 const initializeUser=useCallback(async(userId:string)=>{
   activeUser.current=userId;ready.current=false;setStatus('loading');setSyncError(null)
   try{
     const cloud=await loadCloudGame(userId)
     if(cloud){applyRemote(cloud.state);localStorage.setItem(CLOUD_OWNER_KEY,userId)}
     else if(localStorage.getItem(CLOUD_OWNER_KEY)!==userId&&localStorage.getItem('happy-farm-save-v1')){pendingLegacy.current=getGameSnapshot();useGameStore.getState().resetGame();setLegacyImportRequired(true);setStatus('synced');return}
     else if(localStorage.getItem(CLOUD_OWNER_KEY)&&localStorage.getItem(CLOUD_OWNER_KEY)!==userId)useGameStore.getState().resetGame()
     ready.current=true
     if(!cloud)await persist();else{setStatus('synced');setLastSyncedAt(cloud.updatedAt)}
   }catch(error){ready.current=true;setSyncError(error instanceof Error?error.message:'Không thể tải bản lưu cloud.');setStatus(navigator.onLine?'error':'offline')}
 },[applyRemote,persist])

 useEffect(()=>{
   if(!supabase)return
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
     setSession(next)
     if(next?.user.id){setAuthReady(false);void Promise.all([next.user.id!==activeUser.current?initializeUser(next.user.id):Promise.resolve(),loadProfile(next.user.id).then(setProfile)]).catch(error=>setSyncError(error instanceof Error?error.message:'Không thể tải tài khoản.')).finally(()=>setAuthReady(true))}
     if(!next){activeUser.current=null;ready.current=false;setProfile(null);setStatus('synced');setLastSyncedAt(null);setAuthReady(true)}
   })
   return()=>subscription.unsubscribe()
 },[initializeUser])

 useEffect(()=>useGameStore.subscribe(()=>{
   if(!activeUser.current||!ready.current||applyingRemote.current)return
   dirty.current=true;window.clearTimeout(timer.current);setStatus('saving')
   timer.current=window.setTimeout(()=>void persist(),900)
 }),[persist])

 useEffect(()=>{const online=()=>{if(activeUser.current)void persist()};const offline=()=>activeUser.current&&setStatus('offline');window.addEventListener('online',online);window.addEventListener('offline',offline);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline)}},[persist])

 useEffect(()=>{
   const refresh=()=>{if(activeUser.current&&ready.current&&navigator.onLine)void persist()}
   const visible=()=>{if(document.visibilityState==='visible')refresh()}
   const interval=window.setInterval(refresh,30_000)
   window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible)
   return()=>{window.clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}
 },[persist])

 useEffect(()=>{if(!session)return;void touchOnline();const id=window.setInterval(()=>void touchOnline(),60_000);return()=>window.clearInterval(id)},[session])

 const signIn=signInWithEmail
 const signUp=registerPlayer
 const signOut=async()=>{if(!supabase)return;await persist();await supabase.rpc('set_offline');const {error}=await supabase.auth.signOut();if(error)throw error;useGameStore.getState().resetGame()}
 const updateProfile=async(value:{displayName:string;avatarUrl?:string|null})=>{if(!session)throw new Error('Bạn chưa đăng nhập.');setProfile(await saveProfile(session.user.id,value))}
 const resolveLegacyImport=async(shouldImport:boolean)=>{if(shouldImport&&pendingLegacy.current)applyRemote(pendingLegacy.current);else useGameStore.getState().resetGame();pendingLegacy.current=null;setLegacyImportRequired(false);ready.current=true;await persist();if(shouldImport)await supabase?.rpc('mark_legacy_migrated')}

 return <AuthContext.Provider value={{configured:isSupabaseConfigured,authReady,legacyImportRequired,session,profile,status,lastSyncedAt,syncError,signIn,signUp,resetPassword:requestPasswordReset,updateProfile,resolveLegacyImport,signOut,syncNow:persist}}>{children}</AuthContext.Provider>
}

export const useAuth=()=>{const value=useContext(AuthContext);if(!value)throw new Error('useAuth phải được dùng trong AuthProvider.');return value}
