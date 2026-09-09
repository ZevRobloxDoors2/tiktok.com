import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { getNotifications, getMessages, getUsers } from '../lib/db';
import { Notification, Message, User } from '../types';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Inbox() {
  const { currentUser } = useAppStore();
  const [notifications, setNotifications] = useState<(Notification & { fromUser: User })[]>([]);
  const [conversations, setConversations] = useState<{ user: User, lastMessage: Message }[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'messages'>('activity');

  useEffect(() => {
    if (!currentUser) return;
    
    const loadInbox = async () => {
      const allUsers = await getUsers();
      const allNotifs = await getNotifications();
      const allMsgs = await getMessages();
      
      const userNotifs = allNotifs
        .filter(n => n.userId === currentUser.id)
        .map(n => ({ ...n, fromUser: allUsers.find(u => u.id === n.fromUserId)! }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      const userMsgs = allMsgs.filter(m => m.fromUserId === currentUser.id || m.toUserId === currentUser.id);
      
      // Group messages by user to form conversations
      const convosMap = new Map<string, Message>();
      userMsgs.forEach(m => {
        const otherId = m.fromUserId === currentUser.id ? m.toUserId : m.fromUserId;
        const existing = convosMap.get(otherId);
        if (!existing || existing.timestamp < m.timestamp) {
          convosMap.set(otherId, m);
        }
      });
      
      const convos = Array.from(convosMap.entries()).map(([otherId, lastMsg]) => ({
        user: allUsers.find(u => u.id === otherId)!,
        lastMessage: lastMsg
      })).sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
      
      setNotifications(userNotifs);
      setConversations(convos);
    };
    
    loadInbox();
    const interval = setInterval(loadInbox, 5000); // Poll for real-time feel
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) return <div className="p-8 text-center">Please log in to view your inbox.</div>;

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-200 dark:border-zinc-800 h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
        <h1 className="text-xl font-bold">Inbox</h1>
      </div>
      
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-4 font-semibold ${activeTab === 'activity' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-500'}`}
        >
          Activity
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`flex-1 py-4 font-semibold ${activeTab === 'messages' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-500'}`}
        >
          Messages
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'activity' ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <Bell size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                <p>No new activity</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <div className="relative">
                    <img src={n.fromUser.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center
                      {n.type === 'like' ? 'bg-pink-600' : n.type === 'follow' ? 'bg-blue-500' : 'bg-green-500'} text-white">
                      {n.type === 'like' && <Heart size={12} className="fill-current" />}
                      {n.type === 'follow' && <UserPlus size={12} />}
                      {n.type === 'mention' && <span className="text-[10px] font-bold">@</span>}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <Link to={`/profile/${n.fromUser.handle}`} className="font-bold hover:underline">{n.fromUser.username}</Link>
                      {' '}
                      {n.type === 'like' ? 'liked your video' : n.type === 'follow' ? 'started following you' : 'mentioned you'}
                    </p>
                    <span className="text-xs text-zinc-500">{new Date(n.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <MessageCircle size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                <p>Messages will appear here</p>
              </div>
            ) : (
              conversations.map(c => (
                <Link to={`/messages/${c.user.handle}`} key={c.user.id} className="p-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <img src={c.user.avatarUrl} alt="" className="w-14 h-14 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{c.user.username}</h3>
                    <p className="text-sm text-zinc-500 truncate">
                      {c.lastMessage.fromUserId === currentUser.id ? 'You: ' : ''}{c.lastMessage.content}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
