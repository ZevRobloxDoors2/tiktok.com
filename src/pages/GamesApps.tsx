import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Rocket, Stars, Sparkles, AlertCircle, Play, Info, Square } from 'lucide-react';
import { subscribeToAppSettings } from '../lib/db';
import { useAppStore } from '../store';

export function GamesApps() {
  const { 
    isGameActive, 
    setIsGameActive, 
    activeGameUrl, 
    setActiveGameUrl,
    miniPlayerActive,
    setMiniPlayerActive,
    miniPlayerUrl,
    setMiniPlayerUrl,
    miniPlayerTitle,
    setMiniPlayerTitle
  } = useAppStore();
  const [isCrashed, setIsCrashed] = useState(false);
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAppSettings((settings) => {
      setIsCrashed(settings.gamesAppsCrashed || settings.serverCrashed);
    });

    const handleMessage = (event: MessageEvent) => {
      // Use event.data.type to identify messages from Cinema.html
      if (event.data.type === 'CINEMA_PLAYING') {
        console.log('Cinema is playing:', event.data.title);
        setMiniPlayerTitle(event.data.title);
        setMiniPlayerUrl(event.data.url);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      unsub();
      window.removeEventListener('message', handleMessage);
      // Don't setIsGameActive(false) here, it's handled by handleExit
    };
  }, []);

  const launchItem = (url: string, title?: string) => {
    setActiveGameUrl(url);
    if (title) setMiniPlayerTitle(title);
    setIsGameActive(true);
    // If mini player was active, close it when opening a full screen app
    setMiniPlayerActive(false);
  };

  const handleExit = () => {
    // If Cinema app is active and we have a video URL, trigger mini player
    if (activeGameUrl.includes('Cinema.html') && miniPlayerUrl) {
      setMiniPlayerActive(true);
    }
    setIsGameActive(false);
    // Clear active game URL to prevent accidental triggers
    setActiveGameUrl('');
  };

  if (isCrashed) {
    return (
      <div className="h-full w-full bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Games & Apps has crashed</h1>
        <p className="text-zinc-500 max-w-xs leading-relaxed">
          We are currently experiencing a technical issue with the games and applications service. Please wait shortly for a fix.
        </p>
      </div>
    );
  }

  if (isGameActive) {
    return (
      <div id="game-player-container" className="fixed inset-0 z-[150] bg-black">
        <div className="absolute top-4 right-4 z-[200] flex gap-2">
          <button 
            onClick={handleExit}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Square size={14} fill="currentColor" />
            Exit
          </button>
        </div>
        <iframe 
          id="game-iframe"
          src={activeGameUrl} 
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Game Player"
        />
      </div>
    );
  }

  return (
    <div id="games-page" className="w-full h-full bg-zinc-50 dark:bg-zinc-950 p-6 transition-colors overflow-y-auto relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ y: [-10, 10, -10], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-[5%] opacity-10 text-pink-500"
        >
          <Rocket size={120} />
        </motion.div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 right-[10%] text-indigo-500"
        >
          <Stars size={160} />
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-12 pb-24">
        <header className="mb-12 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <span className="w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            Gaming Zone
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-zinc-900 dark:text-white">
            Games & <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500 uppercase">Apps</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold max-w-xl mx-auto md:mx-0">
            Welcome to the official CentralTok playground. Discover exclusive games and experimental apps built for the community.
          </p>
        </header>

        {/* Featured Games Section */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Featured Games</h2>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Solar Smash Card */}
            <motion.div
              id="solar-smash-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onMouseEnter={() => setHoveredGame('solar-smash')}
              onMouseLeave={() => setHoveredGame(null)}
              onClick={() => launchItem('Games/SolarSmash.html')}
              className="group cursor-pointer relative"
            >
              <AnimatePresence>
                {hoveredGame === 'solar-smash' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1.05 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute -inset-3 border-2 border-pink-500/30 rounded-[1.5rem] z-0"
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10 aspect-square rounded-[1.2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden p-4 flex flex-col items-center justify-center gap-4 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-pink-500/10 group-active:scale-95">
                <motion.div
                  animate={{ 
                    scale: hoveredGame === 'solar-smash' ? 1.1 : 1,
                    rotate: hoveredGame === 'solar-smash' ? [0, 5, -5, 0] : 0
                  }}
                  className="relative"
                >
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-900 dark:text-white filter drop-shadow-md">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
                    <path d="M12 2C6.47 2 2 6.47 2 12C2 17.53 6.47 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="18" cy="6" r="2.5" fill="currentColor" />
                    <path d="M16 10L14 12L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="15" r="1" fill="currentColor" />
                  </svg>
                  <div className="absolute inset-0 bg-pink-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                <div className="text-center">
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-0.5">Solar Smash</h3>
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Planet Destroyer</p>
                </div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div className="bg-pink-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-pink-600/30">
                    <Play size={10} fill="currentColor" />
                    Play
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Coming Soon Placeholders */}
            {[1, 2].map((i) => (
              <div key={i} className="aspect-square rounded-[1.2rem] bg-zinc-100 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3 opacity-40 grayscale transition-all hover:grayscale-0">
                <Sparkles size={24} className="text-zinc-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Locked</p>
              </div>
            ))}
          </div>
        </section>

        {/* Community Apps Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Community Apps</h2>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* CinemaTok App Card */}
            <motion.div
              id="cinema-tok-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onMouseEnter={() => setHoveredGame('cinema')}
              onMouseLeave={() => setHoveredGame(null)}
              onClick={() => launchItem('Apps/Cinema.html')}
              className="group cursor-pointer relative"
            >
              <AnimatePresence>
                {hoveredGame === 'cinema' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1.05 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute -inset-3 border-2 border-pink-600/30 rounded-[1.5rem] z-0"
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10 aspect-square rounded-[1.2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden p-4 flex flex-col items-center justify-center gap-4 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-pink-600/10 group-active:scale-95">
                <motion.div
                  animate={{ 
                    scale: hoveredGame === 'cinema' ? 1.1 : 1,
                    rotate: hoveredGame === 'cinema' ? [0, -2, 2, 0] : 0
                  }}
                  className="relative"
                >
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-pink-600 drop-shadow-[0_0_15px_rgba(219,39,119,0.3)]">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    <line x1="7" y1="2" x2="7" y2="22" />
                    <line x1="17" y1="2" x2="17" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="2" y1="7" x2="7" y2="7" />
                    <line x1="2" y1="17" x2="7" y2="17" />
                    <line x1="17" y1="17" x2="22" y2="17" />
                    <line x1="17" y1="7" x2="22" y2="7" />
                  </svg>
                  <div className="absolute inset-0 bg-pink-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                <div className="text-center">
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-0.5">CinemaTok</h3>
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Global Stream</p>
                </div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div className="bg-pink-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-pink-600/30">
                    <Play size={10} fill="currentColor" />
                    Watch
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Snapchat App Card */}
            <motion.div
              id="snapchat-app-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onMouseEnter={() => setHoveredGame('snapchat')}
              onMouseLeave={() => setHoveredGame(null)}
              onClick={() => launchItem('https://nhjkdbiondnnd.dila.cl/embed.html#https://snapchat.com/spotlight')}
              className="group cursor-pointer relative"
            >
              <AnimatePresence>
                {hoveredGame === 'snapchat' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1.05 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute -inset-3 border-2 border-yellow-400/30 rounded-[1.5rem] z-0"
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10 aspect-square rounded-[1.2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden p-4 flex flex-col items-center justify-center gap-4 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-yellow-400/10 group-active:scale-95">
                <motion.div
                  animate={{ 
                    scale: hoveredGame === 'snapchat' ? 1.1 : 1,
                    y: hoveredGame === 'snapchat' ? [-2, 2, -2] : 0
                  }}
                  transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
                  className="relative"
                >
                  {/* Snapchat Ghost SVG */}
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-[#FFFC00] drop-shadow-[0_0_10px_rgba(255,252,0,0.5)]">
                    <path d="M12 2c-3.314 0-6 2.686-6 6v4.5c0 1.25-.4 1.5-.4 1.5l-1.1 1.1s-.5.5-.5 1.4c0 1.1 1.5 1.5 1.5 1.5.5.1 1.1.1 1.5 0 .2.4.4.8.7 1.2.7.9 1.8 1.8 3.3 2.1 1 .2 2 .2 3 0 1.5-.3 2.6-1.2 3.3-2.1.3-.4.5-.8.7-1.2.4.1 1 .1 1.5 0 0 0 1.5-.4 1.5-1.5 0-.9-.5-1.4-.5-1.4l-1.1-1.1s-.4-.25-.4-1.5V8c0-3.314-2.686-6-6-6z" stroke="black" strokeWidth="1.5" />
                  </svg>
                  <div className="absolute inset-0 bg-yellow-400/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                <div className="text-center">
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-0.5">Snapchat</h3>
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Spotlight View</p>
                </div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div className="bg-yellow-400 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-yellow-400/30">
                    <Sparkles size={10} fill="currentColor" />
                    Open
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Coming Soon App */}
            <div className="aspect-square rounded-[1.2rem] bg-zinc-100 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3 opacity-40 grayscale transition-all hover:grayscale-0">
              <Sparkles size={24} className="text-zinc-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Locked</p>
            </div>
          </div>
        </section>

        {/* Footer Info */}
        <footer className="mt-24 pt-12 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <div className="flex items-center justify-center gap-2 text-zinc-400 mb-4">
            <Info size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">About the playground</span>
          </div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            All games and apps in this section are optimized for the CentralTok platform. Performance may vary depending on your device and internet connection.
          </p>
        </footer>
      </div>
    </div>
  );
}
