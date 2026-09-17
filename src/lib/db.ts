import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, arrayUnion, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Video, Message, Notification, Report, Appeal, AuditLog, Comment, Story, FAQCategory, FAQPost, ForumEditRequest, GroupChat, UserStatus } from '../types';

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
      let dataToSave = { ...item };
      if ((dataToSave as any).videoData) {
        delete (dataToSave as any).videoData;
      }
      dataToSave = JSON.parse(JSON.stringify(dataToSave));
      batch.set(docRef, dataToSave);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error saving collection:", collName, err);
  }
};

export const getUsers = () => fetchCollection<User>('users');
export const saveUsers = (users: User[]) => saveCollection('users', users);

export const updateUser = async (userId: string, data: Partial<User>) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, data);
  } catch (err) {
    console.error("Error updating user:", userId, err);
    throw err;
  }
};

export const updateUserGame = async (userId: string, gameTitle: string | null) => {
  return updateUser(userId, { currentGame: gameTitle || undefined });
};

export const getVideos = () => fetchCollection<Video>('videos');
export const saveVideos = (videos: Video[]) => saveCollection('videos', videos);

export const subscribeToVideo = (videoId: string, callback: (video: Video) => void) => {
  return onSnapshot(doc(db, 'videos', videoId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Video);
    }
  }, (err) => {
    // Ignore errors for non-existent documents or missing permissions gracefully
  });
};

export const ensureVideoInDB = async (video: Video) => {
  try {
    const docRef = doc(db, 'videos', video.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      let dbVideo = { ...video };
      delete dbVideo.videoData;
      dbVideo = JSON.parse(JSON.stringify(dbVideo));
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
      let newVideo = update(snap.data() as Video);
      delete newVideo.videoData;
      newVideo = JSON.parse(JSON.stringify(newVideo));
      await setDoc(docRef, newVideo);
    }
  } catch(err) {
    console.error(err);
  }
};

export const getMessages = () => fetchCollection<Message>('messages');
export const saveMessages = (messages: Message[]) => saveCollection('messages', messages);
export const deleteMessage = async (messageId: string) => {
  const msgs = await getMessages();
  await saveMessages(msgs.filter(m => m.id !== messageId));
};

export const getGroupChats = () => fetchCollection<GroupChat>('group_chats');
export const saveGroupChats = (groups: GroupChat[]) => saveCollection('group_chats', groups);

export const getUserStatuses = () => fetchCollection<UserStatus>('user_statuses');
export const saveUserStatuses = (statuses: UserStatus[]) => saveCollection('user_statuses', statuses);

export const updateTypingStatus = async (userId: string, isTyping: boolean, typingIn?: string) => {
  const statuses = await getUserStatuses();
  const idx = statuses.findIndex(s => s.userId === userId);
  const newStatus: UserStatus = {
    id: userId,
    userId,
    isTyping,
    typingIn,
    lastActive: Date.now()
  };

  if (idx !== -1) {
    statuses[idx] = newStatus;
  } else {
    statuses.push(newStatus);
  }
  await saveUserStatuses(statuses);
};

export const markMessagesFromUserAsRead = async (currentUserId: string, otherUserId: string) => {
  try {
    const allMsgs = await getMessages();
    let hasChanged = false;
    const updated = allMsgs.map(m => {
      if (m.fromUserId === otherUserId && m.toUserId === currentUserId && !m.read) {
        hasChanged = true;
        return { ...m, read: true };
      }
      return m;
    });
    if (hasChanged) {
      await saveMessages(updated);
    }
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
};

export const getNotifications = () => fetchCollection<Notification>('notifications');
export const saveNotifications = (notifications: Notification[]) => saveCollection('notifications', notifications);

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  return onSnapshot(collection(db, 'notifications'), (snapshot) => {
    const notifs = snapshot.docs
      .map(doc => doc.data() as Notification)
      .filter(n => n.userId === userId);
    callback(notifs);
  }, (err) => {
    console.warn("Notification subscription error:", err);
  });
};

export const announceForumPostToEveryone = async (post: FAQPost, author: User) => {
  try {
    const allUsers = await getUsers();
    const existingNotifs = await getNotifications();
    const newNotifs: Notification[] = allUsers.map(user => ({
      id: `notif_forum_${post.id}_${user.id}`,
      userId: user.id,
      type: 'forum_announcement',
      fromUserId: author.id,
      forumPostId: post.id,
      title: post.title,
      message: `📢 New Forum Announcement: "${post.title}"`,
      read: false,
      timestamp: Date.now()
    }));
    await saveNotifications([...existingNotifs, ...newNotifs]);
  } catch (err) {
    console.error("Error announcing forum post to everyone:", err);
  }
};

export const getReports = () => fetchCollection<Report>('reports');
export const saveReports = (reports: Report[]) => saveCollection('reports', reports);

export const getAppeals = () => fetchCollection<Appeal>('appeals');
export const saveAppeals = (appeals: Appeal[]) => saveCollection('appeals', appeals);

export const getAuditLogs = () => fetchCollection<AuditLog>('auditLogs');
export const saveAuditLogs = (logs: AuditLog[]) => saveCollection('auditLogs', logs);

export const deleteVideoFromDB = async (videoId: string) => {
  try {
    const docRef = doc(db, 'videos', videoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting video:", err);
  }
};

export const getStories = () => fetchCollection<Story>('stories');
export const saveStories = (stories: Story[]) => saveCollection('stories', stories);
export const deleteStoryFromDB = async (storyId: string) => {
  try {
    const docRef = doc(db, 'stories', storyId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting story:", err);
  }
};

export const getFAQCategories = () => fetchCollection<FAQCategory>('faq_categories');
export const saveFAQCategories = (cats: FAQCategory[]) => saveCollection('faq_categories', cats);

export const getFAQPosts = () => fetchCollection<FAQPost>('faq_posts');
export const saveFAQPosts = (posts: FAQPost[]) => saveCollection('faq_posts', posts);
export const deleteFAQPostFromDB = async (postId: string) => {
  try {
    const docRef = doc(db, 'faq_posts', postId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting FAQ post:", err);
  }
};

export const getForumEditRequests = () => fetchCollection<ForumEditRequest>('forum_edit_requests');
export const saveForumEditRequests = (reqs: ForumEditRequest[]) => saveCollection('forum_edit_requests', reqs);
export const deleteForumEditRequestFromDB = async (reqId: string) => {
  try {
    const docRef = doc(db, 'forum_edit_requests', reqId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting forum edit request:", err);
  }
};

export const getAppSettings = async () => {
  try {
    const docRef = doc(db, 'app_settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as { 
        useCache: boolean; 
        youtubeApiKeyIndex: number; 
        serverCrashed: boolean; 
        gamesAppsCrashed: boolean; 
      };
    }
    return { 
      useCache: true, 
      youtubeApiKeyIndex: 0, 
      serverCrashed: false, 
      gamesAppsCrashed: false 
    };
  } catch (err) {
    console.error("Error fetching app settings:", err);
    return { 
      useCache: true, 
      youtubeApiKeyIndex: 0, 
      serverCrashed: false, 
      gamesAppsCrashed: false 
    };
  }
};

export const saveAppSettings = async (settings: { 
  useCache: boolean; 
  youtubeApiKeyIndex?: number; 
  serverCrashed?: boolean; 
  gamesAppsCrashed?: boolean; 
}) => {
  try {
    const docRef = doc(db, 'app_settings', 'global');
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.error("Error saving app settings:", err);
  }
};

export const subscribeToAppSettings = (callback: (settings: any) => void) => {
  return onSnapshot(doc(db, 'app_settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({ 
        useCache: true, 
        youtubeApiKeyIndex: 0, 
        serverCrashed: false, 
        gamesAppsCrashed: false 
      });
    }
  });
};

export const clearDb = async () => {};
