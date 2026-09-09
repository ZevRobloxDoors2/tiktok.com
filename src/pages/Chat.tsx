import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getMessages, getUsers, saveMessages } from '../lib/db';
import { Message, User } from '../types';
import { ArrowLeft, Send } from 'lucide-react';

export function Chat() {
  const { handle } = useParams<{ handle: string }>();
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    const loadChat = async () => {
      const users = await getUsers();
      const user = users.find(u => u.handle === handle);
      if (!user) {
        navigate('/messages');
        return;
      }
      setOtherUser(user);
      
      const allMsgs = await getMessages();
      const chatMsgs = allMsgs
        .filter(m => (m.fromUserId === currentUser.id && m.toUserId === user.id) || (m.fromUserId === user.id && m.toUserId === currentUser.id))
        .sort((a, b) => a.timestamp - b.timestamp);
        
      setMessages(chatMsgs);
    };
    
    loadChat();
    const interval = setInterval(loadChat, 2000); // Polling for real-time
    return () => clearInterval(interval);
  }, [handle, currentUser, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUser) return;
    
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      fromUserId: currentUser.id,
      toUserId: otherUser.id,
      content: newMessage.trim(),
      timestamp: Date.now()
    };
    
    const allMsgs = await getMessages();
    await saveMessages([...allMsgs, msg]);
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  if (!currentUser || !otherUser) return null;

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-200 dark:border-zinc-800 h-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate('/messages')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <Link to={`/profile/${otherUser.handle}`} className="flex items-center gap-3">
          <img src={otherUser.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
          <div>
            <h2 className="font-bold leading-tight">{otherUser.username}</h2>
            <p className="text-xs text-zinc-500">@{otherUser.handle}</p>
          </div>
        </Link>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 my-auto">
            Say hi to {otherUser.username}!
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.fromUserId === currentUser.id;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-pink-600 text-white rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 rounded-bl-sm'}`}>
                  <p>{m.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
