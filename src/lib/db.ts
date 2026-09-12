import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Video, Message, Notification, Report, Appeal, AuditLog, Comment } from '../types';

export const initDb = async () => {};

const fetchCollection = async <T>(collName: string): Promise<T[]> => {
  try {
    const snapshot = await getDocs(collection(db, collName));
    return snapshot.docs.map(doc => doc.data() as T);
  } catch (err) {
    console.error("Error fetching collection:", collName, err);
    return [];
  }
};

const saveCollection = async <T extends { id: string }>(collName: string, items: T[]) => {
  if (items.length === 0) return;
  try {
    const batch = writeBatch(db);
    // writeBatch limits to 500, but we'll assume less for this quick migration
    items.forEach(item => {
      const docRef = doc(db, collName, item.id);
      const dataToSave = { ...item };
      if ((dataToSave as any).videoData) {
        delete (dataToSave as any).videoData;
      }
      batch.set(docRef, dataToSave);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error saving collection:", collName, err);
  }
};

export const getUsers = () => fetchCollection<User>('users');
export const saveUsers = (users: User[]) => saveCollection('users', users);

export const getVideos = () => fetchCollection<Video>('videos');
export const saveVideos = (videos: Video[]) => saveCollection('videos', videos);

export const ensureVideoInDB = async (video: Video) => {
  try {
    const docRef = doc(db, 'videos', video.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const dbVideo = { ...video };
      delete dbVideo.videoData;
      await setDoc(docRef, dbVideo);
    }
  } catch (err) {
    console.error(err);
  }
};

export const incrementVideoView = async (id: string, viewerId: string | null) => {
  try {
    const docRef = doc(db, 'videos', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const video = snap.data() as Video;
      const viewedBy = video.viewedBy || [];
      if (viewerId && viewedBy.includes(viewerId)) return;
      
      await updateDoc(docRef, {
        views: (video.views || 0) + 1,
        viewedBy: viewerId ? arrayUnion(viewerId) : viewedBy
      });
    }
  } catch(err) {
    console.error(err);
  }
};

export const addCommentToVideo = async (videoId: string, comment: Comment) => {
  try {
    const docRef = doc(db, 'videos', videoId);
    await updateDoc(docRef, {
      comments: arrayUnion(comment)
    });
  } catch(err) {
    console.error(err);
  }
};

export const updateVideo = async (videoId: string, update: (video: Video) => Video) => {
  try {
    const docRef = doc(db, 'videos', videoId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const newVideo = update(snap.data() as Video);
      delete newVideo.videoData;
      await setDoc(docRef, newVideo);
    }
  } catch(err) {
    console.error(err);
  }
};

export const getMessages = () => fetchCollection<Message>('messages');
export const saveMessages = (messages: Message[]) => saveCollection('messages', messages);

export const getNotifications = () => fetchCollection<Notification>('notifications');
export const saveNotifications = (notifications: Notification[]) => saveCollection('notifications', notifications);

export const getReports = () => fetchCollection<Report>('reports');
export const saveReports = (reports: Report[]) => saveCollection('reports', reports);

export const getAppeals = () => fetchCollection<Appeal>('appeals');
export const saveAppeals = (appeals: Appeal[]) => saveCollection('appeals', appeals);

export const getAuditLogs = () => fetchCollection<AuditLog>('auditLogs');
export const saveAuditLogs = (logs: AuditLog[]) => saveCollection('auditLogs', logs);

export const clearDb = async () => {};
