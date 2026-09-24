import { Video, User } from '../types';

const FALLBACK_USER: User = {
  id: 'system_curator',
  email: 'curator@centraltok.com',
  username: 'CentralTok Curated',
  handle: 'centraltok_picks',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=central',
  bio: 'Curating top-tier, high-energy viral clips when you need pure entertainment.',
  following: [],
  followers: [],
  isPrivate: false,
};

export const FALLBACK_VIDEOS: (Video & { user: User })[] = [
  {
    id: 'fb_blazes',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Next-level action & epic stunts! 🚀 #viral #action #trending',
    tags: ['#action', '#viral', '#trending'],
    likes: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'],
    comments: [],
    timestamp: Date.now() - 3600000,
    views: 14230,
    filter: '',
    user: FALLBACK_USER
  },
  {
    id: 'fb_escapes',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'Unbelievable adventure moments! 🏔️ #adventure #epic #mustwatch',
    tags: ['#adventure', '#epic', '#trending'],
    likes: ['u1', 'u2', 'u3', 'u4', 'u5'],
    comments: [],
    timestamp: Date.now() - 7200000,
    views: 9840,
    filter: '',
    user: FALLBACK_USER
  },
  {
    id: 'fb_joyrides',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    description: 'Pure adrenaline and good vibes ✨ #fun #viral #explore',
    tags: ['#fun', '#viral', '#explore'],
    likes: ['u1', 'u2', 'u3', 'u4', 'u5', 'u8'],
    comments: [],
    timestamp: Date.now() - 14400000,
    views: 18200,
    filter: '',
    user: FALLBACK_USER
  },
  {
    id: 'fb_tears',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    description: 'Sci-fi cinematic masterpiece 🤖 #scifi #cinema #visuals',
    tags: ['#scifi', '#cinema', '#trending'],
    likes: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u9'],
    comments: [],
    timestamp: Date.now() - 28800000,
    views: 25400,
    filter: '',
    user: FALLBACK_USER
  }
];
