import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Maximize2, X, Play, Pause, Square, Move, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '../store';
import YouTube, { YouTubePlayer } from 'react-youtube';

export function MiniPlayer() {
  const { 
    miniPlayerActive, 
    setMiniPlayerActive, 
    miniPlayerUrl, 
    miniPlayerTitle 
  } = useAppStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const playerRef = useRef<YouTubePlayer | null>(null);
  const dragControls = useDragControls();

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(true);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          width: isExpanded ? '640px' : '420px', // "Little huger"
          height: isExpanded ? '360px' : '236px',
        }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        whileDrag={{ 
          scale: 1.02,
          rotate: [0, -1.5, 1.5, -1.5, 0],
          transition: { 
            rotate: { 
              repeat: Infinity, 
              duration: 0.25,
              ease: "easeInOut"
            } 
          }
        }}
        className="fixed bottom-6 right-6 z-[2000] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl bg-zinc-900/90 group"
      >
        {/* Header / Draggable Handle */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4 z-50 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
        >
          <div className="flex items-center gap-2">
            <Move size={14} className="text-white/60" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[200px]">
              {miniPlayerTitle || 'Mini Player'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <Maximize2 size={12} />
            </button>
            <button 
              onClick={() => setMiniPlayerActive(false)}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-white transition-all"
            >
              <X size={12} />
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
              }}
              onStateChange={(e) => {
                setIsPlaying(e.data === 1);
              }}
              className="w-full h-full"
              iframeClassName="w-full h-full pointer-events-none" // Block iframe interaction so custom controls work
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
                className="p-2 rounded-full hover:bg-white/10 text-white transition-all"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlay();
                }}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (playerRef.current) playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10);
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-all"
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
                <span className="text-[10px] font-bold text-white/60">1080p</span>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Glossy Border */}
        <div className="absolute inset-0 border border-white/10 rounded-[2rem] pointer-events-none" />
      </motion.div>
    </AnimatePresence>
  );
}
