import { Video, User } from '../types';

const FALLBACK_USER: User = {
  id: 'system_curator',
  email: 'curator@centraltok.com',
  username: 'CentralTok Picks',
  handle: 'centraltok_picks',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=central',
  bio: 'Curating the best videos across the web when you run out of content.',
  following: [],
  followers: [],
  isPrivate: false,
};

export const FALLBACK_VIDEOS: (Video & { user: User })[] = [
  {
    id: 'fb_blazes',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Epic escapes and blazes! #action #curated',
    tags: ['#action', '#curated'],
    likes: ['u1', 'u2', 'u3', 'u4', 'u5'],
    comments: [],
    timestamp: Date.now() - 86400000,
    views: 5231,
    filter: '',
    user: FALLBACK_USER
  },
  {
    id: 'fb_escapes',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'The great escape! #adventure #curated',
    tags: ['#adventure', '#curated'],
    likes: ['u1', 'u2', 'u3'],
    comments: [],
    timestamp: Date.now() - 172800000,
    views: 890,
    filter: '',
    user: FALLBACK_USER
  },
  {
    id: 'fb_joyrides',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    description: 'Taking a joyride #fun #curated',
    tags: ['#fun', '#curated'],
    likes: ['u1', 'u2'],
    comments: [],
    timestamp: Date.now() - 259200000,
    views: 450,
    filter: '',
    user: FALLBACK_USER
  },
  {
    id: 'fb_tears',
    userId: FALLBACK_USER.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    description: 'Tears of steel mini-clip #scifi #curated',
    tags: ['#scifi', '#curated'],
    likes: ['u1', 'u2', 'u3', 'u4'],
    comments: [],
    timestamp: Date.now() - 345600000,
    views: 2100,
    filter: '',
    user: FALLBACK_USER
  }
];
