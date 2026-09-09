import React, { useState, useEffect, useRef } from 'react';
import { getVideos, getUsers } from '../lib/db';
import { Video, User } from '../types';
import { Search, Hash, Play, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FALLBACK_VIDEOS } from '../lib/fallbackVideos';

export function Explore() {
  const [videos, setVideos] = useState<(Video & { user: User })[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('trending');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadExplore = async () => {
      const allVideos = await getVideos();
      const allUsers = await getUsers();
      
      let enriched = allVideos.map(v => {
        const user = allUsers.find(u => u.id === v.userId) || ({} as User);
        return { 
          ...v, 
          user,
          videoUrl: v.videoData ? URL.createObjectURL(v.videoData) : v.videoUrl
        };
      });
      
      // Inject fallback videos so they show up in Explore and Search
      enriched = [...enriched, ...FALLBACK_VIDEOS];
      
      // Dummy algorithm: Trending = sort by likes, New = sort by time
      if (activeFilter === 'trending') {
        enriched = enriched.sort((a, b) => b.likes.length - a.likes.length);
      } else {
        enriched = enriched.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      if (search) {
        const lowerSearch = search.toLowerCase();
        const searchTag = lowerSearch.startsWith('#') ? lowerSearch : `#${lowerSearch}`;
        
        enriched = enriched.filter(v => 
          v.description.toLowerCase().includes(lowerSearch) || 
          v.tags?.some(t => t.toLowerCase() === searchTag || t.toLowerCase().includes(lowerSearch)) ||
          v.user.username.toLowerCase().includes(lowerSearch)
        );
        
        const foundUsers = allUsers.filter(u => 
          u.username.toLowerCase().includes(lowerSearch) || 
          u.handle.toLowerCase().includes(lowerSearch)
        );
        setUsersList(foundUsers);
      } else {
        setUsersList([]);
      }
      
      setVideos(enriched);
    };
    loadExplore();
  }, [search, activeFilter]);

  // Infinite Scroll Observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(p => p + 1);
      }
    });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [videos]);

  const filters = ['trending', 'new', 'music', 'gaming', 'comedy'];
  const displayedVideos = videos.slice(0, page * 12);

  return (
    <div className="w-full h-full max-w-4xl mx-auto p-4 flex flex-col hide-scrollbar overflow-y-auto pb-24 md:pb-4">
      <div className="sticky top-0 bg-white dark:bg-zinc-950 pt-4 pb-2 z-10">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts, videos, or #hashtags..."
            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-full py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2">
          {filters.map(f => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold capitalize transition-colors ${activeFilter === f ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      {search && usersList.length > 0 && (
        <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h2 className="font-bold text-lg mb-4 px-2">Users</h2>
          <div className="flex flex-col gap-3">
            {usersList.map(user => (
              <Link to={`/profile/${user.handle}`} key={user.id} className="flex items-center gap-3 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 p-2 rounded-lg transition-colors">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold">{user.username.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{user.username}</p>
                  <p className="text-sm text-zinc-500 truncate">@{user.handle}</p>
                </div>
                <div className="text-sm font-semibold px-4 py-1.5 bg-pink-600 text-white rounded-md">View</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
        {displayedVideos.map(video => (
          <Link to={`/profile/${video.user.handle}`} key={video.id} className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden group">
            {video.isYouTube ? (
              <img 
                src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                className={`w-full h-full object-cover ${video.filter || ''}`} 
                alt="YouTube thumbnail"
              />
            ) : video.videoUrl && (video.videoUrl.endsWith('.mp4') || video.videoUrl.startsWith('blob:')) ? (
              <video src={video.videoUrl} className={`w-full h-full object-cover ${video.filter || ''}`} />
            ) : video.videoUrl ? (
              <img src={video.videoUrl} className={`w-full h-full object-cover ${video.filter || ''}`} alt="Thumbnail" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <Loader2 size={24} className="text-zinc-600 animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
              <p className="font-bold text-sm truncate">@{video.user.username}</p>
              <p className="text-xs truncate">{video.description}</p>
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white font-semibold text-xs drop-shadow-md group-hover:opacity-0 transition-opacity">
              <Play size={14} className="fill-current" />
              <span>{video.views || 0}</span>
            </div>
          </Link>
        ))}
        {videos.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-500">
            No videos found for your search.
          </div>
        )}
      </div>
      
      {displayedVideos.length < videos.length && (
        <div ref={loadMoreRef} className="py-8 flex justify-center text-zinc-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
