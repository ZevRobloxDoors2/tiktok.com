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
        initial={{ opacity: 0, scale: 0.8, x: -100, y: -100 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          x: position.x, 
          y: position.y,
          width: isExpanded ? '80vw' : '320px',
          height: isExpanded ? '80vh' : '180px',
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => {
          setIsDragging(false);
          setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
        }}
        className={`fixed z-[1000] rounded-3xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-3xl bg-white/10 group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[120px]">
              {miniPlayerTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Maximize2 size={12} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMiniPlayerActive(false);
              }}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-white transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <div className="w-full h-full bg-black relative">
          <iframe 
            src={miniPlayerUrl}
            className="w-full h-full border-none pointer-events-auto"
            allowFullScreen
          />
          {/* Prevent clicks during drag */}
          {isDragging && <div className="absolute inset-0 z-30" />}
        </div>

        {/* Resize Handle (Custom) */}
        <div className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100">
           <svg viewBox="0 0 10 10" className="w-full h-full text-white/40"><path d="M0 10 L10 10 L10 0" fill="currentColor" /></svg>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
