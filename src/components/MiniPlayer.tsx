import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Maximize2, X, Play, Pause, Square, Move, SkipForward, SkipBack, Volume2, VolumeX, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import YouTube, { YouTubePlayer } from 'react-youtube';

export function MiniPlayer() {
  const { 
    miniPlayerActive, 
    setMiniPlayerActive, 
    miniPlayerUrl, 
    miniPlayerTitle 
  } = useAppStore();
  
  const [size, setSize] = useState<'mini' | 'medium' | 'expanded'>('mini');
  const [isTucked, setIsTucked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const dragControls = useDragControls();

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(true);
    setIsTucked(false);
  }, [miniPlayerUrl]);

  if (!miniPlayerActive) return null;

  const isYoutube = miniPlayerUrl.includes('youtube.com') || miniPlayerUrl.includes('youtu.be');
  const videoId = isYoutube ? (miniPlayerUrl.match(/[?&]v=([^&]+)/)?.[1] || miniPlayerUrl.split('/').pop()?.split('?')[0]) : null;

  const handleTogglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const getDimensions = () => {
    if (isTucked) return { width: 60, height: 120 };
    switch (size) {
      case 'expanded': return { width: 640, height: 360 };
      case 'medium': return { width: 520, height: 292 };
      default: return { width: 400, height: 225 };
    }
  };

  const dims = getDimensions();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100, filter: "blur(20px)" }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          x: isTucked ? 30 : 0, // Tuck it slightly off border
          filter: "blur(0px)",
          width: dims.width, 
          height: dims.height,
          borderRadius: isTucked ? '12px' : '32px',
        }}
        exit={{ opacity: 0, scale: 0.5, y: 100, filter: "blur(20px)" }}
        drag={!isTucked}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        transition={{ type: "spring", damping: 25, stiffness: 150 }}
        className={`fixed bottom-6 right-6 z-[2000] overflow-hidden shadow-[0_40px_100px_-12px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-[30px] bg-white/5 saturate-150 group transition-all duration-300 ${isTucked ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => isTucked && setIsTucked(false)}
      >
        {isTucked ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-pink-600 to-indigo-600">
            <ChevronLeft size={24} className="text-white animate-pulse" />
            <div className="w-1 h-12 bg-white/30 rounded-full" />
          </div>
        ) : (
          <>
            {/* Animated Glass Shine */}
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
              className="absolute inset-0 z-10 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
            />

            {/* Ambient Glow */}
            <div className="absolute -inset-20 bg-gradient-to-tr from-pink-500/20 via-indigo-500/20 to-cyan-500/20 blur-[60px] opacity-30 pointer-events-none" />

            {/* Header / Draggable Handle */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-5 z-50 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-5px] group-hover:translate-y-0 cursor-move"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md">
                  <Move size={14} className="text-white" />
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] truncate max-w-[150px] drop-shadow-md">
                  {miniPlayerTitle || 'Aura Player'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Minimize Button (Toggles between mini and medium/expanded) */}
                <button 
                  onClick={() => setSize(prev => prev === 'mini' ? 'medium' : 'mini')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95 border border-white/5 backdrop-blur-md"
                  title="Toggle Scale"
                >
                  <Minus size={14} />
                </button>
                {/* Tuck Button (Next to corner, moves it away/tucks) */}
                <button 
                  onClick={() => setIsTucked(true)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95 border border-white/5 backdrop-blur-md"
                  title="Tuck to Side"
                >
                  <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => setSize(prev => prev === 'expanded' ? 'mini' : 'expanded')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95 border border-white/5 backdrop-blur-md"
                  title="Fullscreen Mini"
                >
                  <Maximize2 size={14} />
                </button>
                <button 
                  onClick={() => setMiniPlayerActive(false)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-white transition-all hover:scale-110 active:scale-95 border border-red-500/20 backdrop-blur-md"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Video Content */}
            <div className="w-full h-full bg-black relative">
              {videoId ? (
                <YouTube
                  videoId={videoId}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 1,
                      controls: 0,
                      modestbranding: 1,
                      rel: 0,
                    },
                  }}
                  onReady={(e) => {
                    playerRef.current = e.target;
                    // Ensure it starts correctly
                    if (isPlaying) e.target.playVideo();
                    if (isMuted) e.target.mute();
                  }}
                  onStateChange={(e) => {
                    setIsPlaying(e.data === 1);
                  }}
                  className="w-full h-full"
                  iframeClassName="w-full h-full pointer-events-none" 
                />
              ) : (
                <iframe 
                  src={miniPlayerUrl}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}

              {/* Custom Controls Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none">
                <div className="flex items-center justify-center gap-6 mb-2 pointer-events-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playerRef.current) playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                  >
                    <SkipBack size={20} fill="currentColor" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePlay();
                    }}
                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playerRef.current) playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                  >
                    <SkipForward size={20} fill="currentColor" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between pointer-events-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMute();
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-all"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">HD Active</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Glossy Border */}
            <div className="absolute inset-0 border border-white/10 rounded-[2rem] pointer-events-none" />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
