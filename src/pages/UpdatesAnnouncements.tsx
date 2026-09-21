import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DiscordForum } from '../components/DiscordForum';
import { Megaphone, Sparkles, ChevronLeft, ArrowLeftRight } from 'lucide-react';

export function UpdatesAnnouncements() {
  const navigate = useNavigate();

  return (
    <div id="updates-announcements-page" className="w-full h-full overflow-y-auto bg-[#111214] text-white p-2 md:p-6 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Navigation Bar / Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1e1f22] p-3 md:p-4 rounded-2xl border border-zinc-800">
          
          <div className="flex items-center gap-2">
            <button
              id="back-to-forum-hub-btn"
              onClick={() => navigate('/forum')}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800"
              title="Return to Forum Gateway"
            >
              <ChevronLeft size={16} />
              <span>Forums Hub</span>
            </button>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Updates & Announcements
              </span>
            </div>
          </div>

          {/* Two Section Switcher Tabs */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="p-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                <Megaphone size={14} />
                <span>Updates & Announcements</span>
              </button>

              <button
                id="switch-to-sneak-peeks-btn"
                onClick={() => navigate('/forum/sneak-peeks')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold transition-all"
              >
                <Sparkles size={14} className="text-pink-500" />
                <span>Sneak Peeks</span>
              </button>
            </div>
          </div>

        </div>

        {/* Discord Forum Core */}
        <DiscordForum />

      </div>
    </div>
  );
}
