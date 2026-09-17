import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX, 
  Monitor, Settings, Maximize2, Minimize2, 
  UserPlus, MessageSquare, Video, VideoOff
} from 'lucide-react';
import { useAppStore } from '../store';

export function CallOverlay() {
  const { isCalling, setIsCalling, callData, currentUser } = useAppStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteIsSpeaking, setRemoteIsSpeaking] = useState(false);

  // Simulate speaking indicators
  useEffect(() => {
    if (!isCalling) return;
    const interval = setInterval(() => {
      if (!isMuted) setIsSpeaking(Math.random() > 0.7);
      setRemoteIsSpeaking(Math.random() > 0.8);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCalling, isMuted]);

  if (!isCalling || !callData) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] bg-zinc-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8"
      >
        {/* Top Header */}
        <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-zinc-400 text-sm font-medium tracking-wide uppercase">Private Call</span>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
            <button className="text-zinc-400 hover:text-white transition-colors"><UserPlus size={20} /></button>
            <button className="text-zinc-400 hover:text-white transition-colors"><Settings size={20} /></button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-6xl flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          
          {/* Local User */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <motion.div 
                animate={{ 
                  scale: isSpeaking ? [1, 1.05, 1] : 1,
                  boxShadow: isSpeaking ? "0 0 0 4px #22c55e" : "0 0 0 0px #22c55e"
                }}
                transition={{ duration: 0.2 }}
                className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-2xl relative"
              >
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-600">
                    {currentUser?.username?.charAt(0)}
                  </div>
                )}
                
                {/* Camera Overlay */}
                {isCameraOn && (
                   <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                     <span className="text-xs text-zinc-500 italic">Camera active...</span>
                   </div>
                )}
              </motion.div>
              
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-800 rounded-full text-xs font-bold text-white shadow-lg border border-zinc-700">
                You
              </div>
              
              {isMuted && (
                <div className="absolute -top-1 -right-1 p-1.5 bg-red-500 rounded-full border-2 border-zinc-950 text-white">
                  <MicOff size={14} />
                </div>
              )}
            </div>
          </div>

          {/* VS / Middle Decor */}
          <div className="hidden md:flex flex-col items-center gap-2">
            <div className="w-px h-12 bg-gradient-to-t from-zinc-700 to-transparent" />
            <div className="text-zinc-600 font-black text-2xl italic tracking-tighter">VS</div>
            <div className="w-px h-12 bg-gradient-to-b from-zinc-700 to-transparent" />
          </div>

          {/* Remote User */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <motion.div 
                animate={{ 
                  scale: remoteIsSpeaking ? [1, 1.05, 1] : 1,
                  boxShadow: remoteIsSpeaking ? "0 0 0 4px #22c55e" : "0 0 0 0px #22c55e"
                }}
                transition={{ duration: 0.2 }}
                className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 shadow-2xl"
              >
                {callData.user.avatarUrl ? (
                  <img src={callData.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-600">
                    {callData.user.username.charAt(0)}
                  </div>
                )}
              </motion.div>
              
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-800 rounded-full text-xs font-bold text-white shadow-lg border border-zinc-700">
                {callData.user.username}
              </div>
            </div>
          </div>

        </div>

        {/* Screen Share Preview (Mock) */}
        {isScreenSharing && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-x-0 bottom-32 mx-auto w-full max-w-2xl aspect-video bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl mb-8 group"
          >
             <div className="absolute inset-0 flex items-center justify-center">
                <Monitor size={48} className="text-zinc-800" />
                <span className="absolute bottom-4 left-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Screen Sharing Active</span>
             </div>
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIsScreenSharing(false)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Stop Sharing</button>
             </div>
          </motion.div>
        )}

        {/* Controls Dock */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/50 border border-white/10 p-4 rounded-3xl backdrop-blur-2xl shadow-2xl">
          
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'hover:bg-white/10 text-zinc-300'}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button 
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-4 rounded-2xl transition-all ${isDeafened ? 'bg-red-500 text-white' : 'hover:bg-white/10 text-zinc-300'}`}
              title={isDeafened ? "Undeafen" : "Deafen"}
            >
              {isDeafened ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>

          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-4 rounded-2xl transition-all ${isCameraOn ? 'bg-zinc-100 text-zinc-900' : 'hover:bg-white/10 text-zinc-300'}`}
            >
              {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            <button 
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-4 rounded-2xl transition-all ${isScreenSharing ? 'bg-emerald-500 text-white' : 'hover:bg-white/10 text-zinc-300'}`}
            >
              <Monitor size={24} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-4 rounded-2xl hover:bg-white/10 text-zinc-300">
              <MessageSquare size={24} />
            </button>
            <button 
              onClick={() => setIsCalling(false)}
              className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-90"
            >
              <PhoneOff size={24} />
            </button>
          </div>

        </div>

      </motion.div>
    </AnimatePresence>
  );
}
