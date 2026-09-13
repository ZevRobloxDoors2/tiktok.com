import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Play, User as UserIcon, Compass } from 'lucide-react';
import { getVideos, getUsers } from '../lib/db';
import { Video, User } from '../types';
import { VideoItem } from './Home';

export function Explore() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState<{ type: 'user' | 'video', data: any }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setActiveQuery(query.trim());
    setLoading(true);
    setResults([]);

    try {
      const q = query.trim().toLowerCase();
      const allUsers = await getUsers();
      const allVideos = await getVideos();

      // Find users and sort by closeness
      const matchedUsers = allUsers.filter(u => u.username.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)).sort((a, b) => {
        const aExact = a.username.toLowerCase() === q || a.handle.toLowerCase() === q;
        const bExact = b.username.toLowerCase() === q || b.handle.toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const aStarts = a.username.toLowerCase().startsWith(q) || a.handle.toLowerCase().startsWith(q);
        const bStarts = b.username.toLowerCase().startsWith(q) || b.handle.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return 0;
      });
      
      // Find local videos
      const matchedLocalVideos = allVideos.filter(v => {
        const u = allUsers.find(user => user.id === v.userId);
        return v.description.toLowerCase().includes(q) || v.tags.some(t => t.toLowerCase().includes(q)) || (u && u.username.toLowerCase().includes(q));
      }).map(v => ({...v, user: allUsers.find(u => u.id === v.userId)}));

      // Find YouTube shorts
      let youtubeVideos: any[] = [];
      try {
        const res = await fetch(`/api/youtube-shorts?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          youtubeVideos = (data.items || []).filter((i:any) => i.id?.videoId).map((item: any) => {
            const vidId = item.id.videoId;
            return {
              id: `yt_${vidId}`,
              isYouTube: true,
              youtubeId: vidId,
              videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
              description: (item.snippet.title || '')
                .replace(/#shorts?\b/gi, '')
                .replace(/#youtubeshorts?\b/gi, '')
                .replace(/#youtube\b/gi, '')
                .trim(),
              user: {
                handle: item.snippet.channelTitle,
                username: item.snippet.channelTitle,
                avatarUrl: ''
              },
              views: 0
            }
          });
        }
      } catch (err) {}

      const formattedResults = [
        ...matchedUsers.map(u => ({ type: 'user' as const, data: u })),
        ...matchedLocalVideos.map(v => ({ type: 'video' as const, data: v })),
        ...youtubeVideos.map(v => ({ type: 'video' as const, data: v }))
      ];

      setResults(formattedResults);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const users = results.filter(r => r.type === 'user').map(r => r.data as User);
  const videos = results.filter(r => r.type === 'video').map(r => r.data as Video & { user: User });

  return (
    <div className="w-full max-w-4xl mx-auto h-[100dvh] flex flex-col p-4 md:p-8 overflow-hidden relative">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 md:p-8 flex flex-col h-full overflow-hidden">
        
        <form onSubmit={handleSearch} className="relative mb-6">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, tags, or videos..."
            className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-pink-500 transition-colors font-medium text-lg"
          />
          <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        </form>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
          {loading && (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && activeQuery && results.length === 0 && (
            <div className="text-center text-zinc-500 py-12">
              No results found for "{activeQuery}"
            </div>
          )}

          {!loading && !activeQuery && (
            <div className="text-center text-zinc-500 py-12">
              <Compass size={48} className="mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">Explore CentralTok</h2>
              <p>Search for users, trending tags, or topics.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-8">
              {users.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Users</h3>
                  <div className="space-y-4">
                    {users.map(user => (
                      <div key={user.id} onClick={() => navigate(`/profile/${user.handle}`)} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                        <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.handle}`} alt={user.handle} className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" />
                        <div>
                          <p className="font-bold">{user.username}</p>
                          <p className="text-sm text-zinc-500">@{user.handle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Videos</h3>
                  <div className="grid grid-cols-3 gap-1 md:gap-4">
                    {videos.map((video, idx) => (
                      <div 
                        key={video.id + idx} 
                        className="aspect-[9/16] bg-zinc-100 dark:bg-zinc-800 rounded-md md:rounded-xl relative overflow-hidden cursor-pointer group"
                        onClick={() => setSelectedVideo(video)}
                      >
                        {video.isYouTube && video.youtubeId ? (
                          <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} className="w-full h-full object-cover" alt="thumbnail" />
                        ) : video.videoUrl ? (
                          <video src={video.videoUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play size={24} className="text-zinc-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={32} className="text-white drop-shadow-md" />
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-md">
                          <Play size={12} className="fill-current" /> {video.views || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Video Playback Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedVideo(null)} 
            className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <div className="w-full h-full max-w-[500px] relative bg-zinc-950">
            <VideoItem video={{...selectedVideo, feedId: selectedVideo.id} as any} />
          </div>
        </div>
      )}
    </div>
  );
}
