import { supabase } from './supabaseClient'

const client=()=>{if(!supabase)throw new Error('Supabase chưa được cấu hình.');return supabase}
const friendly=(message:string)=>message.includes('already registered')?'Email này đã được sử dụng.':message.includes('Database error')?'Tên người chơi đã tồn tại hoặc máy chủ chưa được cấu hình đúng.':'Không thể kết nối máy chủ, vui lòng thử lại.'
export const signInWithEmail=async(email:string,password:string)=>{const {error}=await client().auth.signInWithPassword({email,password});if(error)throw new Error(error.message.includes('Invalid login')?'Email hoặc mật khẩu không đúng.':friendly(error.message))}
export const registerPlayer=async(input:{email:string;password:string;username:string;displayName:string})=>{
 const {data:available,error:checkError}=await client().rpc('username_available',{candidate:input.username});if(checkError)throw new Error(friendly(checkError.message));if(!available)throw new Error('Tên người chơi đã tồn tại hoặc không hợp lệ.')
 const {data,error}=await client().auth.signUp({email:input.email,password:input.password,options:{data:{username:input.username.toLowerCase(),display_name:input.displayName.trim()}}});if(error)throw new Error(friendly(error.message));return Boolean(data.session)
}
export const requestPasswordReset=async(email:string)=>{const {error}=await client().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(error)throw new Error(friendly(error.message))}
