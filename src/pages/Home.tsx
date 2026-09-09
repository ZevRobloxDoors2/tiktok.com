import React, { useEffect, useState, useRef } from 'react';
import { getVideos, getUsers, saveUsers, saveVideos, incrementVideoView, ensureVideoInDB } from '../lib/db';
import { Video, User } from '../types';
import { useAppStore } from '../store';
import { Heart, MessageCircle, Share2, Music, Bookmark, Eye, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Comments } from '../components/Comments';
import { FALLBACK_VIDEOS } from '../lib/fallbackVideos';
import YouTube, { YouTubeEvent, YouTubeProps } from 'react-youtube';

export function Home() {
  const [videos, setVideos] = useState<(Video & { user: User; feedId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [introPhase, setIntroPhase] = useState<'loading' | 'merging' | 'expanding' | 'done'>('loading');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ytPageToken, setYtPageToken] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchBatch = async (isRefresh = false) => {
    if (loadingBatch) return;
    setLoadingBatch(true);
    
    try {
      const currentToken = isRefresh ? '' : ytPageToken;
      let fetchedYt: any[] = [];
      
      try {
        const res = await fetch(`/api/youtube-shorts?pageToken=${currentToken}`);
        if (res.ok) {
          const data = await res.json();
          setYtPageToken(data.nextPageToken || '');
          if (data.items) {
            fetchedYt = data.items.map((item: any) => ({
              id: `yt_${item.id.videoId}`,
              userId: 'youtube_user',
              videoUrl: '',
              description: item.snippet.title,
              tags: ['#shorts', '#youtube'],
              likes: [],
              comments: [],
              timestamp: Date.now(),
              views: 0,
              filter: '',
              isYouTube: true,
              youtubeId: item.id.videoId,
              user: {
                id: 'youtube_user',
                username: item.snippet.channelTitle,
                handle: item.snippet.channelTitle.replace(/\s+/g, '').toLowerCase(),
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.snippet.channelId}`,
                bio: 'YouTube Creator',
                following: [],
                followers: [],
                isPrivate: false,
              }
            }));
          }
        } else {
           throw new Error("API not ok");
        }
      } catch (e) {
        console.warn("YouTube API not available or failed, using local fallbacks");
        fetchedYt = FALLBACK_VIDEOS.map((v, i) => ({
          ...v,
          id: `${v.id}_${Date.now()}_${i}`
        }));
      }

      const allDbVideos = await getVideos();
      const allUsers = await getUsers();

      // Enrich fetched YT with DB stats if they exist
      const enrichedYt = fetchedYt.map(ytv => {
        const dbMatch = allDbVideos.find(v => v.id === ytv.id);
        return dbMatch ? { ...dbMatch, user: allUsers.find(u => u.id === dbMatch.userId) || ytv.user } : ytv;
      });

      // Get UGVs
      const ugvs = allDbVideos.filter(v => !v.isYouTube).map(v => ({
        ...v,
        videoUrl: v.videoData ? URL.createObjectURL(v.videoData) : v.videoUrl,
        user: allUsers.find(u => u.id === v.userId) || ({} as User)
      }));

      // Pick random UGVs to mix (up to 3)
      const selectedUgvs = [];
      if (ugvs.length > 0) {
        const mixCount = Math.min(ugvs.length, 3);
        for (let i = 0; i < mixCount; i++) {
          selectedUgvs.push(ugvs[Math.floor(Math.random() * ugvs.length)]);
        }
      }

      // Shuffle
      const mixed = [...enrichedYt, ...selectedUgvs].sort(() => Math.random() - 0.5);
      const mixedWithFeedIds = mixed.map(v => ({ ...v, feedId: Math.random().toString(36).substring(2, 9) }));

      if (isRefresh) {
        setVideos(mixedWithFeedIds);
      } else {
        setVideos(prev => [...prev, ...mixedWithFeedIds]);
      }
    } finally {
      setLoadingBatch(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, []);

  // Pull to refresh logic
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling) return;
    const y = e.touches[0].clientY;
    if (y - startY > 120) {
      setRefreshing(true);
      fetchBatch(true);
      setPulling(false);
    }
  };

  const handleTouchEnd = () => setPulling(false);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && videos.length > 0 && !loadingBatch) {
        fetchBatch();
      }
    });
    if (endRef.current) observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [videos, loadingBatch]);

  // Intro Animation progression
  useEffect(() => {
    if (!loading && introPhase === 'loading') {
      setIntroPhase('merging');
      setTimeout(() => {
        setIntroPhase('expanding');
        setTimeout(() => {
          setIntroPhase('done');
        }, 1000); // 1s for blackhole expansion
      }, 1000); // 1s for merging
    }
  }, [loading, introPhase]);

  if (introPhase !== 'done') {
    return (
      <div className="h-full w-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
        {/* Black Hole */}
        {introPhase === 'expanding' && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 100, opacity: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute z-50 w-10 h-10 bg-black rounded-full"
            style={{ 
              boxShadow: '0 0 100px 50px rgba(0,0,0,1)' 
            }}
          />
        )}

        <div className={`relative z-10 flex items-center justify-center transition-opacity duration-500 ${introPhase === 'expanding' ? 'opacity-0' : 'opacity-100'}`}>
           {/* C Icon */}
           <motion.div 
             animate={introPhase === 'merging' ? { scale: 0, opacity: 0 } : {}}
             transition={{ duration: 0.8 }}
             className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
           >
             C
           </motion.div>
           
           {/* T Icon Circling */}
           <motion.div
             animate={introPhase === 'loading' ? { rotate: 360 } : { rotate: 0 }}
             transition={introPhase === 'loading' ? { duration: 1.5, repeat: Infinity, ease: "linear" } : { duration: 0 }}
             className="absolute w-32 h-32 flex items-start justify-center"
           >
             <motion.div 
               animate={introPhase === 'merging' ? { y: 64, scale: 0, opacity: 0 } : {}}
               transition={{ duration: 0.8 }}
               className="text-5xl font-black text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
             >
               T
             </motion.div>
           </motion.div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full w-full max-w-[500px] snap-y snap-mandatory overflow-y-scroll hide-scrollbar pb-16 md:pb-0 relative"
    >
      {refreshing && (
        <div className="absolute top-4 left-0 right-0 flex justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 p-2 rounded-full shadow-lg text-pink-600 animate-spin">
            <Loader2 size={24} />
          </div>
        </div>
      )}
      {videos.map((video) => (
        <VideoItem key={video.feedId} video={video} />
      ))}
      <div ref={endRef} className="h-20 snap-start flex items-center justify-center bg-black shrink-0">
        <Loader2 size={32} className="animate-spin text-zinc-500" />
      </div>
    </motion.div>
  );
}

export function VideoItem({ video }: { video: Video & { user: User; feedId: string } }) {
  const { currentUser, setCurrentUser } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(video.likes?.includes(currentUser?.id || '') || false);
  const [likesCount, setLikesCount] = useState(video.likes?.length || 0);
  const [isFavorited, setIsFavorited] = useState(currentUser?.favorites?.includes(video.id) || false);
  const [views, setViews] = useState(video.views || 0);
  const [hasViewed, setHasViewed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (video.isYouTube && ytPlayerRef.current) {
            ytPlayerRef.current.playVideo();
          } else if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          setIsPlaying(true);
          
          if (!hasViewed) {
            setHasViewed(true);
            const localViewed: string[] = JSON.parse(localStorage.getItem('viewedVideos') || '[]');
            
            if (currentUser) {
              if (!video.viewedBy?.includes(currentUser.id)) {
                ensureVideoInDB(video).then(() => {
                  incrementVideoView(video.id, currentUser.id);
                  setViews(v => v + 1);
                });
              }
            } else {
              if (!localViewed.includes(video.id)) {
                ensureVideoInDB(video).then(() => {
                  incrementVideoView(video.id, null);
                  setViews(v => v + 1);
                  localStorage.setItem('viewedVideos', JSON.stringify([...localViewed, video.id]));
                });
              }
            }
          }
        } else {
          if (video.isYouTube && ytPlayerRef.current) {
            ytPlayerRef.current.pauseVideo();
          } else if (videoRef.current) {
            videoRef.current.pause();
          }
          setIsPlaying(false);
        }
      });
    }, { threshold: 0.6 });
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasViewed, video.id, currentUser, video.isYouTube]);

  const onReady = (e: YouTubeEvent) => {
    ytPlayerRef.current = e.target;
    if (isPlaying) {
      e.target.playVideo();
    }
  };

  const togglePlay = () => {
    if (video.isYouTube && ytPlayerRef.current) {
      if (isPlaying) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikesCount(prev => newStatus ? prev + 1 : prev - 1);
    
    await ensureVideoInDB(video);
    const dbVideos = await getVideos();
    const idx = dbVideos.findIndex(v => v.id === video.id);
    if (idx !== -1) {
      const currentLikes = dbVideos[idx].likes || [];
      if (newStatus) {
        if (!currentLikes.includes(currentUser.id)) {
          dbVideos[idx].likes = [...currentLikes, currentUser.id];
        }
      } else {
        dbVideos[idx].likes = currentLikes.filter(id => id !== currentUser.id);
      }
      await saveVideos(dbVideos);
    }
  };

  const handleFavorite = async () => {
    if (!currentUser) return;
    const newStatus = !isFavorited;
    setIsFavorited(newStatus);
    
    let newFavorites = currentUser.favorites || [];
    if (newStatus) {
      newFavorites = [...newFavorites, video.id];
    } else {
      newFavorites = newFavorites.filter(id => id !== video.id);
    }
    
    const updatedUser = { ...currentUser, favorites: newFavorites };
    setCurrentUser(updatedUser);
    
    const allUsers = await getUsers();
    const uIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (uIdx !== -1) {
      allUsers[uIdx] = updatedUser;
      await saveUsers(allUsers);
    }
    
    await ensureVideoInDB(video);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/#/video/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Watch this on CentralTok',
          url: url
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !video.isYouTube) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current && !video.isYouTube) {
      videoRef.current.currentTime = (val / 100) * videoRef.current.duration;
      setProgress(val);
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      loop: 1,
      playlist: video.youtubeId,
      fs: 0,
      disablekb: 1,
      playsinline: 1
    },
  };

  return (
    <div ref={containerRef} className="w-full h-full snap-start relative bg-black flex items-center justify-center group overflow-hidden">
      {video.isYouTube ? (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <YouTube 
            videoId={video.youtubeId} 
            opts={opts} 
            onReady={onReady} 
            className="w-full h-full" 
            iframeClassName="w-full h-full object-contain" 
          />
        </div>
      ) : video.videoUrl.endsWith('.mp4') || video.videoUrl.startsWith('blob:') ? (
        <video 
          ref={videoRef}
          src={video.videoUrl}
          className={`w-full h-full object-contain bg-black ${video.filter || ''}`}
          loop
          playsInline
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
        />
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center" onClick={togglePlay}>
          <img src={video.videoUrl} alt="Video fallback" className={`w-full h-full object-contain opacity-50 ${video.filter || ''}`} />
        </div>
      )}
      
      {video.isYouTube && <div className="absolute inset-0 z-10" onClick={togglePlay} />}
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-black/50 p-4 rounded-full text-white">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}

      {/* Right Action Bar */}
      <div className="absolute right-4 bottom-24 md:bottom-20 flex flex-col items-center gap-5 z-20 transition-opacity">
        <div className="relative mb-2">
          <Link to={`/profile/${video.user?.handle}`}>
            <img src={video.user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.userId}`} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white bg-zinc-800 object-cover" />
          </Link>
          <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-lg font-bold pb-0.5">
            +
          </button>
        </div>
        
        <button className="flex flex-col items-center gap-1 text-white drop-shadow-md" onClick={handleLike}>
          <div className={`p-2 rounded-full ${isLiked ? 'bg-pink-600/20 text-pink-600' : 'bg-zinc-800/40 text-white'}`}>
            <Heart size={28} className={isLiked ? 'fill-current' : ''} />
          </div>
          <span className="text-xs font-semibold">{likesCount}</span>
        </button>
        
        <button className="flex flex-col items-center gap-1 text-white drop-shadow-md" onClick={() => setShowComments(true)}>
          <div className="p-2 rounded-full bg-zinc-800/40 text-white">
            <MessageCircle size={28} className="fill-current" />
          </div>
          <span className="text-xs font-semibold">{video.comments?.length || 0}</span>
        </button>
        
        <button className="flex flex-col items-center gap-1 text-white drop-shadow-md" onClick={handleFavorite}>
          <div className={`p-2 rounded-full ${isFavorited ? 'text-yellow-400' : 'bg-zinc-800/40 text-white'}`}>
            <Bookmark size={28} className={isFavorited ? 'fill-current' : ''} />
          </div>
          <span className="text-xs font-semibold">Save</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-white drop-shadow-md" onClick={handleShare}>
          <div className="p-2 rounded-full bg-zinc-800/40 text-white">
            <Share2 size={28} className="fill-current" />
          </div>
          <span className="text-xs font-semibold">Share</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-16 p-4 pt-10 bg-gradient-to-t from-black/80 to-transparent text-white pb-20 md:pb-6 pointer-events-none z-10">
        <Link to={`/profile/${video.user?.handle}`} className="font-bold text-lg pointer-events-auto hover:underline">
          @{video.user?.handle || 'unknown'}
        </Link>
        <p className="text-sm mt-1 mb-2 line-clamp-2">{video.description}</p>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {video.tags?.map(t => (
            <span key={t} className="text-sm font-semibold">{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Music size={14} className="animate-[spin_4s_linear_infinite]" />
            <span>{video.isYouTube ? 'YouTube Short Audio' : 'Original Audio'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye size={16} />
            <span>{views}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {!video.isYouTube && (
        <div className="absolute bottom-12 md:bottom-0 left-0 right-0 h-4 z-30 flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
          <input 
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress || 0}
            onChange={handleSeek}
            className="w-full video-slider"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      
      {showComments && (
        <>
          <div className="absolute inset-0 bg-black/50 z-30 pointer-events-auto" onClick={() => setShowComments(false)} />
          <Comments video={video} onClose={() => setShowComments(false)} />
        </>
      )}
    </div>
  );
}
