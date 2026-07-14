export interface HarvestInteraction<Result> {
  plotId:string
  request:(requestId:string)=>Promise<Result>
  onStart:(requestId:string)=>void
  onSuccess:(result:Result)=>void
  onRollback:(error:unknown)=>void
}

export class HarvestInteractionCoordinator {
  private readonly active=new Map<string,string>()

  isActive=(plotId:string)=>this.active.has(plotId)
  activePlotIds=()=>new Set(this.active.keys())

  run=async<Result>({plotId,request,onStart,onSuccess,onRollback}:HarvestInteraction<Result>)=>{
    if(this.active.has(plotId))return false
    const requestId=crypto.randomUUID()
    this.active.set(plotId,requestId)
    try{onStart(requestId);const result=await request(requestId);onSuccess(result);return true}
    catch(error){onRollback(error);return false}
    finally{if(this.active.get(plotId)===requestId)this.active.delete(plotId)}
  }
}

export const withHarvestTimeout=<T>(request:Promise<T>,timeoutMs=12000)=>new Promise<T>((resolve,reject)=>{
 const timer=setTimeout(()=>reject(new Error('HARVEST_TIMEOUT')),timeoutMs)
 request.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)})
})
