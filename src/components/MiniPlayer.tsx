import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, X, Play, Pause, Square } from 'lucide-react';
import { useAppStore } from '../store';

export function MiniPlayer() {
  const { 
    miniPlayerActive, 
    setMiniPlayerActive, 
    miniPlayerUrl, 
    miniPlayerTitle 
  } = useAppStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const playerRef = useRef<HTMLDivElement>(null);

  if (!miniPlayerActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={playerRef}
        initial={{ opacity: 0, scale: 1.5, x: "50vw", y: "50vh", rotate: 5, filter: "blur(20px)" }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          x: position.x, 
          y: position.y,
          rotate: 0,
          filter: "blur(0px)",
          width: isExpanded ? '90vw' : '360px',
          height: isExpanded ? '85vh' : '202px',
        }}
        exit={{ opacity: 0, scale: 0.5, x: -100, y: -100, filter: "blur(10px)" }}
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => {
          setIsDragging(false);
          setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
        }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
        className={`fixed z-[2000] rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-12px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-[40px] bg-white/5 saturate-150 group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-indigo-500/10 opacity-50 pointer-events-none" />
        
        {/* Header / Draggable Area */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse" />
            <span className="text-[11px] font-black text-white uppercase tracking-[0.15em] truncate max-w-[180px] drop-shadow-md">
              {miniPlayerTitle || 'AuraFlix Live'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-90 border border-white/5"
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMiniPlayerActive(false);
              }}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-white transition-all hover:scale-110 active:scale-90 border border-red-500/20"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="w-full h-full bg-black/40 relative">
          <iframe 
            src={miniPlayerUrl}
            className="w-full h-full border-none pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {/* Invisible drag shield - only active when dragging */}
          {isDragging && <div className="absolute inset-0 z-40 bg-transparent" />}
        </div>

        {/* Glass Border Accent */}
        <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] pointer-events-none" />
      </motion.div>
    </AnimatePresence>
  );
}
