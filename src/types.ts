export type User = {
  id: string;
  email: string;
  username: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  following: string[]; // User IDs
  followers: string[]; // User IDs
  favorites?: string[]; // Video IDs
  isPrivate: boolean;
  role?: 'user' | 'staff' | 'owner';
  banStatus?: {
    type: 'temp' | 'perm' | 'hwid';
    until?: number; // timestamp for temp ban
    linkedAccount?: string; // for hwid evasion links
    reason?: string;
  };
};

export type Report = {
  id: string;
  videoId: string;
  reporterId: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  adminNotes?: string;
  timestamp: number;
};

export type Appeal = {
  id: string;
  userId: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  adminNotes?: string;
  timestamp: number;
};

export type AuditLog = {
  id: string;
  action: string;
  adminId: string;
  targetId: string; // userId or videoId
  details: string;
  timestamp: number;
  reverted?: boolean;
};

export type Video = {
  id: string;
  userId: string;
  videoUrl: string; // Object URL or external URL
  videoData?: File | Blob; // For IDB storage
  description: string;
  tags: string[];
  likes: string[]; // User IDs
  comments: Comment[];
  timestamp: number;
  views: number;
  viewedBy?: string[]; // User IDs or anonymous session IDs
  filter: string;
  isYouTube?: boolean;
  youtubeId?: string;
  feedId?: string;
};

export type Comment = {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  replyToId?: string;
};

export type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: number;
};

export type Notification = {
  id: string;
  userId: string; // The user receiving the notification
  type: 'like' | 'mention' | 'message' | 'follow';
  fromUserId: string;
  videoId?: string;
  read: boolean;
  timestamp: number;
};
