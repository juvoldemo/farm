import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children:ReactNode }
interface State { error:Error|null }

export class GameErrorBoundary extends Component<Props,State>{
 state:State={error:null}
 static getDerivedStateFromError(error:Error):State{return{error}}
 componentDidCatch(error:Error,info:ErrorInfo){if(import.meta.env.DEV)console.error('Game render error:',error,info)}
 render(){
  if(!this.state.error)return this.props.children
  return <main className="game-error-screen"><section><span>🌱</span><h1>Không thể mở nông trại</h1><p>Game gặp lỗi khi đọc dữ liệu trên thiết bị. Hãy tải lại trang; dữ liệu cloud của tài khoản không bị xóa.</p>{import.meta.env.DEV&&<code>{this.state.error.message}</code>}<button onClick={()=>window.location.reload()}>Tải lại game</button></section></main>
 }
}
