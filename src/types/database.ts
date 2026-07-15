import type { GameStateData } from './game'

export interface PlayerProfile {id:string;username:string;displayName:string;playerCode:string;avatarUrl:string|null;level:number;status:'online'|'offline';lastOnlineAt:string;createdAt?:string}
export type FriendshipStatus='pending'|'accepted'|'rejected'|'blocked'
export interface Friendship {id:string;requesterId:string;addresseeId:string;status:FriendshipStatus;createdAt:string;updatedAt:string;other:PlayerProfile}
export interface GameNotification {id:string;type:string;title:string;message:string;senderId:string|null;isRead:boolean;referenceId:string|null;createdAt:string;sender?:PlayerProfile}
export interface FriendFarm {profile:PlayerProfile;state:GameStateData;stolenCropInstanceIds:string[]}
export interface CropTheftResult {state:GameStateData;cropInstanceId:string;cropId:string;quantity:number;percentage:number}
