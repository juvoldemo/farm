export type HapticType='light'|'medium'|'success'|'warning'|'error'
const patterns:Record<HapticType,number|number[]>={light:12,medium:25,success:[15,30,15],warning:[30,40,30],error:[50,30,50]}
export const triggerHapticFeedback=(type:HapticType,enabled=true)=>{if(enabled&&typeof navigator!=='undefined'&&'vibrate'in navigator)navigator.vibrate(patterns[type])}
