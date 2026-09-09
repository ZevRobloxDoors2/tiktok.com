import { get, set } from 'idb-keyval';
import { User, Video, Message, Notification, Report, Appeal, AuditLog } from '../types';

export const initDb = async () => {
  const users = await get<User[]>('users');
  if (!users) {
    await set('users', []);
    await set('videos', []);
    await set('messages', []);
    await set('notifications', []);
    await set('reports', []);
    await set('appeals', []);
    await set('auditLogs', []);
  }
};

export const getUsers = async () => (await get<User[]>('users')) || [];
export const saveUsers = async (users: User[]) => await set('users', users);

export const getVideos = async () => (await get<Video[]>('videos')) || [];
export const saveVideos = async (videos: Video[]) => await set('videos', videos);

export const ensureVideoInDB = async (video: Video) => {
  const videos = await getVideos();
  if (!videos.find(v => v.id === video.id)) {
    const dbVideo: Video = {
      id: video.id,
      userId: video.userId,
      videoUrl: video.videoUrl,
      videoData: video.videoData,
      description: video.description,
      tags: video.tags,
      likes: video.likes || [],
      comments: video.comments || [],
      timestamp: video.timestamp,
      views: video.views || 0,
      filter: video.filter,
      viewedBy: video.viewedBy || [],
      isYouTube: video.isYouTube,
      youtubeId: video.youtubeId
    };
    videos.push(dbVideo);
    await saveVideos(videos);
  }
};

export const incrementVideoView = async (id: string, viewerId: string | null) => {
  const videos = await getVideos();
  const idx = videos.findIndex(v => v.id === id);
  if (idx !== -1) {
    const viewedBy = videos[idx].viewedBy || [];
    if (viewerId && viewedBy.includes(viewerId)) return; // Already viewed
    
    videos[idx].views = (videos[idx].views || 0) + 1;
    if (viewerId) {
      videos[idx].viewedBy = [...viewedBy, viewerId];
    }
    await saveVideos(videos);
  }
};

export const addCommentToVideo = async (videoId: string, comment: any) => {
  const videos = await getVideos();
  const idx = videos.findIndex(v => v.id === videoId);
  if (idx !== -1) {
    videos[idx].comments = [...(videos[idx].comments || []), comment];
    await saveVideos(videos);
  }
};

export const getMessages = async () => (await get<Message[]>('messages')) || [];
export const saveMessages = async (messages: Message[]) => await set('messages', messages);

export const getNotifications = async () => (await get<Notification[]>('notifications')) || [];
export const saveNotifications = async (notifications: Notification[]) => await set('notifications', notifications);

export const getReports = async () => (await get<Report[]>('reports')) || [];
export const saveReports = async (reports: Report[]) => await set('reports', reports);

export const getAppeals = async () => (await get<Appeal[]>('appeals')) || [];
export const saveAppeals = async (appeals: Appeal[]) => await set('appeals', appeals);

export const getAuditLogs = async () => (await get<AuditLog[]>('auditLogs')) || [];
export const saveAuditLogs = async (logs: AuditLog[]) => await set('auditLogs', logs);

export const clearDb = async () => {
  await set('users', []);
  await set('videos', []);
  await set('messages', []);
  await set('notifications', []);
  await set('reports', []);
  await set('appeals', []);
  await set('auditLogs', []);
};
