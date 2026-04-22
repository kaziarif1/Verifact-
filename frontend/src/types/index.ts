export type UserRole = 'user'|'verified'|'admin';
export type ClaimCategory = 'politics'|'health'|'science'|'technology'|'entertainment'|'sports'|'finance'|'other';
export type FinalVerdict = 'Pending'|'Fact'|'Rumor';
export type AdminDecision = 'Processing'|'Fact'|'Rumor';
export type MLLabel = 'FACT'|'RUMOR'|'UNCERTAIN'|'PENDING';
export type VoteDirection = 'up'|'down';
export type VoteOutcome = 'pending'|'correct'|'incorrect'|'inconclusive';

export interface TrustScore {
  current: number;
  history: Array<{date:string;value:number;reason:string}>;
  totalVotesCast: number; correctVotes: number; incorrectVotes: number;
  pendingVotes: number; lastCalculatedAt: string;
}

export interface IUser {
  _id: string; email: string; username: string; displayName: string;
  bio?: string; avatarUrl?: string; role: UserRole;
  isEmailVerified: boolean; isBanned: boolean; trustScore: TrustScore;
  stats: {totalClaims:number;factsPosted:number;rumorsPosted:number};
  followerCount?: number; followingCount?: number; isFollowing?: boolean;
  verifiedAt?: string; createdAt: string; updatedAt: string;
}

export interface VoteStats {
  totalUpvotes:number; totalDownvotes:number; totalVotes:number;
  upvotePct:number; downvotePct:number;
  trustedUpvotes:number; trustedDownvotes:number; trustedTotalVotes:number;
  trustedUpvotePct:number; weightedScore:number;
}

export interface MLPrediction {
  label:MLLabel; confidence:number; modelVersion:string; processedAt?:string;
}

export interface IClaim {
  _id:string; author:IUser; title:string; body?:string; category:ClaimCategory;
  media:{type:'none'|'image'|'video';url?:string;thumbnailUrl?:string};
  voteStats:VoteStats; mlPrediction:MLPrediction;
  adminDecision:AdminDecision; adminNote?:string;
  adminDecidedBy?:{username:string;displayName:string}; adminDecidedAt?:string;
  finalVerdict:FinalVerdict; trendingScore:number; viewCount:number;
  isDeleted:boolean; createdAt:string; updatedAt:string;
  myVote?:VoteDirection|null;
  group?: IGroup;
}

export interface IGroup {
  _id: string; name: string; slug: string; description: string;
  avatarUrl?: string; bannerUrl?: string; category: ClaimCategory;
  memberCount: number; claimCount: number; isMember?: boolean;
  rules?: string[]; createdBy: IUser; createdAt: string;
}

export interface IMessage {
  _id: string; from: IUser; to: string; content: string;
  isRead: boolean; createdAt: string;
}

export interface IConversation {
  partner: IUser; lastMessage: IMessage; unreadCount: number;
}

export interface INotification {
  _id:string; type:'verdict_set'|'verified_granted'|'vote_milestone'|'admin_message'|'new_follower'|'new_message';
  title:string; message:string; link:string; isRead:boolean; createdAt:string;
}

export interface PaginationMeta {
  hasMore:boolean; cursor?:string; total?:number; page?:number; limit?:number; unreadCount?:number;
}
export interface ApiResponse<T> { data:T; meta?:PaginationMeta; message?:string; }
