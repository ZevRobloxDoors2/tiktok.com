import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Sparkles, ArrowRight, ShieldCheck, Flame, Bell, Eye, MessageSquare, ChevronRight } from 'lucide-react';
import { getFAQPosts, getSneakPeeks } from '../lib/db';
import { FAQPost, SneakPeek } from '../types';

export function ForumHub() {
  const navigate = useNavigate();
  const [latestAnnouncement, setLatestAnnouncement] = useState<FAQPost | null>(null);
  const [latestSneakPeek, setLatestSneakPeek] = useState<SneakPeek | null>(null);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [sneakPeekCount, setSneakPeekCount] = useState(0);

  useEffect(() => {
    const loadPreviewData = async () => {
      try {
        const [posts, peeks] = await Promise.all([getFAQPosts(), getSneakPeeks()]);
        setAnnouncementCount(posts.length);
        setSneakPeekCount(peeks.length);
        if (posts.length > 0) {
          const sortedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp);
          setLatestAnnouncement(sortedPosts[0]);
        }
        if (peeks.length > 0) {
          const sortedPeeks = [...peeks].sort((a, b) => b.timestamp - a.timestamp);
          setLatestSneakPeek(sortedPeeks[0]);
        }
      } catch (err) {
        console.error("Error loading forum hub previews:", err);
      }
    };
    loadPreviewData();
  }, []);

  return (
    <div id="forum-hub-page" className="w-full h-full overflow-y-auto bg-[#111214] text-white p-4 md:p-8 pb-24 md:pb-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hub Header */}
        <div className="text-center max-w-xl mx-auto pt-4 md:pt-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-black uppercase tracking-widest text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            CentralTok Community Forums
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Where would you like to go?
          </h1>
          <p className="text-sm md:text-base text-zinc-400">
            Select a forum section below to browse official platform announcements or check out exclusive sneak peeks of upcoming features.
          </p>
        </div>

        {/* Two Separate Forum Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Updates & Announcements */}
          <div
            id="hub-card-updates"
            onClick={() => navigate('/forum/updates')}
            className="group relative flex flex-col justify-between p-7 rounded-3xl bg-gradient-to-b from-[#1e1f22] to-[#18191c] border border-zinc-800 hover:border-blue-500/70 shadow-xl hover:shadow-blue-500/10 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-bl-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Megaphone size={28} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-950/70 text-blue-300 border border-blue-800/50">
                    {announcementCount > 0 ? `${announcementCount} Posts` : 'Official News'}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                Updates & Announcements
              </h2>
              <p className="text-sm text-zinc-400 mt-2.5 leading-relaxed">
                Official releases, system patch notes, verified policies, staff guidelines, and frequently asked questions.
              </p>

              {/* Latest Post Snippet */}
              {latestAnnouncement && (
                <div className="mt-6 p-3.5 rounded-2xl bg-black/40 border border-zinc-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase text-[10px] tracking-wider mb-1">
                    <Bell size={11} /> Latest Update
                  </div>
                  <div className="font-bold text-zinc-200 truncate">{latestAnnouncement.title}</div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">
                    {new Date(latestAnnouncement.timestamp).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-sm font-black text-blue-400 group-hover:text-blue-300">
              <span className="flex items-center gap-1.5">
                <span>Explore Updates & Announcements</span>
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

          {/* Card 2: Sneak Peeks */}
          <div
            id="hub-card-sneak-peeks"
            onClick={() => navigate('/forum/sneak-peeks')}
            className="group relative flex flex-col justify-between p-7 rounded-3xl bg-gradient-to-b from-[#1e1f22] to-[#18191c] border border-zinc-800 hover:border-pink-500/70 shadow-xl hover:shadow-pink-500/10 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500/10 rounded-bl-full blur-2xl pointer-events-none group-hover:bg-pink-500/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 group-hover:bg-pink-600 group-hover:text-white transition-all">
                  <Sparkles size={28} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-pink-950/70 text-pink-300 border border-pink-800/50">
                    {sneakPeekCount > 0 ? `${sneakPeekCount} Teasers` : 'Dev Drops'}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-white group-hover:text-pink-400 transition-colors">
                Sneak Peeks
              </h2>
              <p className="text-sm text-zinc-400 mt-2.5 leading-relaxed">
                Exclusive teasers of unreleased features, live concept previews, upcoming V1.0 milestones, and community hype polls.
              </p>

              {/* Latest Sneak Peek Snippet */}
              {latestSneakPeek && (
                <div className="mt-6 p-3.5 rounded-2xl bg-black/40 border border-zinc-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-pink-400 font-bold uppercase text-[10px] tracking-wider mb-1">
                    <Flame size={11} /> Featured Teaser
                  </div>
                  <div className="font-bold text-zinc-200 truncate">{latestSneakPeek.title}</div>
                  <div className="text-zinc-500 text-[11px] mt-0.5 flex items-center gap-2">
                    <span>{latestSneakPeek.targetVersion || 'Next Release'}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{latestSneakPeek.progressPercentage}% Ready</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-sm font-black text-pink-400 group-hover:text-pink-300">
              <span className="flex items-center gap-1.5">
                <span>Explore Sneak Peeks</span>
              </span>
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-colors">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

        </div>

        {/* Quick Nav Switcher Banner */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span>Tip: Both sections have dedicated feedback threads and community reactions.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/forum/updates')}
              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
            >
              Updates
            </button>
            <button
              onClick={() => navigate('/forum/sneak-peeks')}
              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
            >
              Sneak Peeks
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
