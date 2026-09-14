import React from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Rocket, Stars, Sparkles } from 'lucide-react';

export function GamesApps() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            y: [-10, 10, -10],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-[10%] opacity-20 dark:opacity-10 text-pink-500"
        >
          <Rocket size={120} />
        </motion.div>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 right-[15%] text-indigo-500"
        >
          <Stars size={160} />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-xl text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 relative inline-block"
        >
          <div className="relative z-10 p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden group">
            {/* Pulsing Gradient Backglow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-purple-500/5 to-indigo-500/10 opacity-50" />
            
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Gamepad2 size={100} className="text-zinc-900 dark:text-white mx-auto relative z-10 drop-shadow-lg" strokeWidth={1.5} />
            </motion.div>
            
            <div className="absolute -bottom-2 -right-2 opacity-50 group-hover:scale-110 transition-transform">
              <Sparkles size={48} className="text-amber-400" />
            </div>
          </div>

          {/* Animated Orbiting Particles */}
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-3 h-3 bg-pink-500 rounded-full"
              animate={{
                x: [Math.cos(angle) * 100, Math.cos(angle + 360) * 100],
                y: [Math.sin(angle) * 100, Math.sin(angle + 360) * 100],
                scale: [1, 1.5, 0.8, 1],
                opacity: [0.8, 1, 0.5, 0.8]
              }}
              transition={{ 
                duration: 6 + i, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              style={{ margin: '-6px' }}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
          >
            <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            Coming Soon
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter mb-4 text-zinc-900 dark:text-white">
            Games & <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500">Apps</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 font-bold leading-relaxed mb-8">
            Currently working on all the games right now, once done, we will release this to you. Thank you for your pantice.
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    delay: i * 0.2,
                    ease: "easeInOut" 
                  }}
                  className="w-2.5 h-2.5 bg-pink-500 rounded-full"
                />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Loading Awesomeness</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
