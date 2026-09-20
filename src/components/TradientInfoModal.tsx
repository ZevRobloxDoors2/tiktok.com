import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, ShieldCheck, Zap, Heart, CheckCircle } from 'lucide-react';
import { HolographicBadge } from './UIPolish';

interface TradientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradientInfoModal: React.FC<TradientInfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            {/* Header / Banner */}
            <div className="h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_0,transparent_70%)] animate-pulse" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                  <Trophy size={32} className="text-white" />
                </div>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="flex justify-center mb-2">
                <HolographicBadge type="verified" />
                <span className="mx-2 text-zinc-300">/</span>
                <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-indigo-600/20">
                  <ShieldCheck size={12} /> Tradient
                </div>
              </div>
              
              <h2 className="text-2xl font-black mb-4">What is Tradient?</h2>
              
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                Tradient is an <span className="text-indigo-600 font-bold">exclusive honor</span> awarded only to the most trusted members of the CentralTok community. 
                It signifies that your contributions—especially your reports and moderation assistance—have been <span className="font-bold">100% accurate</span>.
              </p>

              <div className="space-y-4 text-left">
                <div className="flex gap-4 items-start p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Enhanced Credibility</h4>
                    <p className="text-xs text-zinc-500">Your reports are prioritized and carry significantly more weight in the system.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-lg">
                    <Heart size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Community Trust</h4>
                    <p className="text-xs text-zinc-500">The Tradient badge is a symbol of integrity, showing you help keep CentralTok safe.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
              >
                Got it, thanks!
              </button>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md border border-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
