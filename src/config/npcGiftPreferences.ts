import type { NpcGiftPreference } from '../types/npc'
export const npcGiftPreferences:Record<string,NpcGiftPreference[]>={
 hoa:[{itemId:'small-flower',reaction:'loved'},{itemId:'tea',reaction:'loved'},{itemId:'strawberry',reaction:'liked'},{itemId:'cabbage',reaction:'neutral'}],
 ba:[{itemId:'garden-tool',reaction:'loved'},{itemId:'tea',reaction:'loved'},{itemId:'corn',reaction:'liked'},{itemId:'salad',reaction:'disliked'}],
 lan:[{itemId:'tomato',reaction:'loved'},{itemId:'strawberry',reaction:'loved'},{itemId:'small-flower',reaction:'liked'},{itemId:'fertilizer',reaction:'disliked'}],
}
