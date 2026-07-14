import type { SeedRarity, TraitId } from '../types/game'

export const geneticsLimits={maxTraitLevel:3,maxTraits:3,minGrowthFactor:.6,maxYieldBonus:1,maxHybridChance:.5,maxSeedReturnChance:.6,giantValueMultiplier:3,pendingSeedLimit:50,discoveryXp:15} as const

export const traitDefinitions:Record<TraitId,{name:string;icon:string;description:string;values:readonly [number,number,number]}>= {
 fast_growth:{name:'Lớn nhanh',icon:'⚡',description:'Giảm thời gian sinh trưởng',values:[.05,.10,.15]},
 high_yield:{name:'Sai quả',icon:'🧺',description:'Tăng sản lượng thu hoạch',values:[.05,.10,.20]},
 high_quality:{name:'Chất lượng cao',icon:'✨',description:'Tăng cơ hội nông sản Bạc/Vàng',values:[.05,.10,.15]},
 drought_resistant:{name:'Chịu hạn',icon:'🌵',description:'Chịu khô lâu hơn',values:[.15,.30,.50]},
 rain_loving:{name:'Ưa mưa',icon:'🌧️',description:'Tăng sản lượng sau khi gặp mưa',values:[.05,.10,.15]},
 giant_fruit:{name:'Quả khổng lồ',icon:'🏆',description:'Cơ hội nhận quả khổng lồ',values:[.02,.05,.10]},
 good_seed:{name:'Hạt giống tốt',icon:'🌰',description:'Tăng cơ hội nhận lại hạt',values:[.05,.10,.20]},
 easy_hybrid:{name:'Dễ lai',icon:'🧬',description:'Tăng cơ hội lai giống',values:[.05,.10,.20]},
}

export const rarityConfig:Record<SeedRarity,{name:string;color:string;minTraits:number;maxTraits:number;maxLevel:1|2|3}>={
 common:{name:'Thường',color:'#879184',minTraits:0,maxTraits:1,maxLevel:1},
 uncommon:{name:'Tốt',color:'#67a83f',minTraits:1,maxTraits:1,maxLevel:2},
 rare:{name:'Hiếm',color:'#398bd2',minTraits:1,maxTraits:2,maxLevel:2},
 epic:{name:'Sử thi',color:'#9a5bd1',minTraits:2,maxTraits:3,maxLevel:3},
 legendary:{name:'Huyền thoại',color:'#e59a20',minTraits:3,maxTraits:3,maxLevel:3},
}

export const inheritanceConfig={singleParentChance:.35,bothParentsChance:.70,upgradeChance:.10,mutationChance:.03,maxInheritedTraits:3} as const
export const hybridConfig={sameCropChance:.06,careBonus:.03,maxChance:.5,minimumStagePercent:90} as const

export const traitValue=(id:TraitId,level:number)=>traitDefinitions[id].values[Math.max(0,Math.min(2,level-1))]
