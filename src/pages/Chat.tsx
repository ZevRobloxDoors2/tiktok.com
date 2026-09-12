import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getMessages, getUsers, saveMessages, getNotifications, saveNotifications } from '../lib/db';
import { Message, User } from '../types';
import { ArrowLeft, Send, Phone, Paperclip, Camera, X, Loader2, Mic, Square } from 'lucide-react';

export function Chat() {
  const { handle } = useParams<{ handle: string }>();
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFilter, setCameraFilter] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const sendMessage = async (content: string, imageUrl?: string, videoUrl?: string, audioUrl?: string) => {
    if ((!content.trim() && !imageUrl && !videoUrl && !audioUrl) || !currentUser || !otherUser) return;
    
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      fromUserId: currentUser.id,
      toUserId: otherUser.id,
      content: content.trim(),
      imageUrl,
      videoUrl,
      audioUrl,
      timestamp: Date.now()
    };
    
    const allMsgs = await getMessages();
    await saveMessages([...allMsgs, msg]);
    const notifications = await getNotifications();
    await saveNotifications([...notifications, {
      id: `notif_${Date.now()}`,
      userId: otherUser.id,
      type: 'message',
      fromUserId: currentUser.id,
      read: false,
      timestamp: Date.now()
    }]);
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    await sendMessage(newMessage);
  };

  const uploadToCloudinary = async (file: Blob | File): Promise<{url: string, type: string}> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'centraltok');
    
    const res = await fetch('https://api.cloudinary.com/v1_1/nmdsqhos/auto/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    return { url: data.secure_url, type: data.resource_type };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const { url, type } = await uploadToCloudinary(file);
      await sendMessage('', type === 'image' ? url : undefined, type === 'video' ? url : undefined);
    } catch(err) {
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Audio Recording Functions
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsUploading(true);
        try {
          const { url } = await uploadToCloudinary(audioBlob);
          await sendMessage('', undefined, undefined, url);
        } catch(err) {
          alert("Failed to send audio message.");
        } finally {
          setIsUploading(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Camera Functions
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch(err) {
      alert("Camera access denied.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.filter = getComputedStyle(video).filter; // Apply CSS filter to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setIsUploading(true);
        stopCamera();
        try {
          const { url } = await uploadToCloudinary(blob);
          await sendMessage('', url, undefined);
        } catch(err) {
          alert("Failed to send photo.");
        } finally {
          setIsUploading(false);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  if (!currentUser || !otherUser) return null;

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-200 dark:border-zinc-800 h-[100dvh] flex flex-col bg-white dark:bg-zinc-950 relative">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/messages')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <Link to={`/profile/${otherUser.handle}`} className="flex items-center gap-3">
            <img src={otherUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h2 className="font-bold leading-tight">{otherUser.username}</h2>
              <p className="text-xs text-zinc-500">@{otherUser.handle}</p>
            </div>
          </Link>
        </div>
        <button 
          title="Coming soon"
          className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          onClick={() => alert("Calls coming soon!")}
        >
          <Phone size={22} />
        </button>
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
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMe ? 'bg-pink-600 text-white rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 rounded-bl-sm'}`}>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="attachment" className="w-full rounded-lg mb-2 object-cover max-h-64" />
                  )}
                  {m.videoUrl && (
                    <video src={m.videoUrl} controls className="w-full rounded-lg mb-2 max-h-64 object-cover" />
                  )}
                  {m.audioUrl && (
                    <audio src={m.audioUrl} controls className="w-full mb-2" />
                  )}
                  {m.content && <p>{m.content}</p>}
                  {m.sharedVideoId?.startsWith('yt_') && (
                    <a href={`https://www.youtube.com/shorts/${m.sharedVideoId.slice(3)}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline opacity-90">Watch shared Short</a>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 pb-8 md:pb-4 bg-white dark:bg-zinc-950">
        <form onSubmit={handleSend} className="flex items-center gap-2 relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,video/*" 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <Paperclip size={20} />
          </button>
          <button 
            type="button" 
            onClick={startCamera} 
            className="p-2.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors mr-1"
          >
            <Camera size={20} />
          </button>
          
          {isRecordingAudio ? (
            <button
              type="button"
              onClick={stopAudioRecording}
              className="p-2.5 text-red-500 hover:text-red-600 transition-colors mr-1 animate-pulse"
              title="Stop recording"
            >
              <Square size={20} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startAudioRecording}
              className="p-2.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors mr-1"
              title="Record audio"
            >
              <Mic size={20} />
            </button>
          )}

          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={isRecordingAudio ? "Recording audio..." : "Send a message..."}
            className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            disabled={isUploading || isRecordingAudio}
          />
          <button 
            type="submit"
            disabled={(!newMessage.trim() && !isUploading) || isUploading}
            className="p-2.5 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
          </button>
        </form>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
            <button onClick={stopCamera} className="text-white p-2 bg-black/50 rounded-full">
              <X size={24} />
            </button>
            <div className="flex gap-2">
              <button onClick={() => setCameraFilter('')} className={`px-3 py-1 rounded-full text-xs font-bold ${cameraFilter === '' ? 'bg-pink-600 text-white' : 'bg-white/20 text-white'}`}>Normal</button>
              <button onClick={() => setCameraFilter('grayscale')} className={`px-3 py-1 rounded-full text-xs font-bold ${cameraFilter === 'grayscale' ? 'bg-pink-600 text-white' : 'bg-white/20 text-white'}`}>B&W</button>
              <button onClick={() => setCameraFilter('saturate-200')} className={`px-3 py-1 rounded-full text-xs font-bold ${cameraFilter === 'saturate-200' ? 'bg-pink-600 text-white' : 'bg-white/20 text-white'}`}>Vivid</button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraFilter}`} />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          <div className="p-8 pb-12 flex justify-center bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
            <button 
              onClick={takePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors focus:ring-4 ring-pink-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
