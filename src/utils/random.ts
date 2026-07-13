export type RandomGenerator = () => number

export const createRandomGenerator = (seed = Date.now()): RandomGenerator => {
  let value = seed >>> 0
  return () => { value += 0x6d2b79f5; let t=value; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296 }
}
export const randomInteger = (min:number,max:number,random:RandomGenerator=Math.random) => Math.floor(random()*(max-min+1))+min
export const randomChance = (chance:number,random:RandomGenerator=Math.random) => random()<Math.max(0,Math.min(1,chance))
