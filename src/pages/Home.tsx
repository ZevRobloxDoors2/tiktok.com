import React, { useEffect, useState, useRef } from 'react';
import { getVideos, getUsers, saveUsers, saveVideos, incrementVideoView, ensureVideoInDB } from '../lib/db';
import { Video, User } from '../types';
import { useAppStore } from '../store';
import { Heart, MessageCircle, Share2, Music, Bookmark, Eye, Loader2, Flag, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Comments } from '../components/Comments';
import YouTube, { YouTubeEvent, YouTubeProps } from 'react-youtube';
import { getReports, saveReports } from '../lib/db';
import { normalizeYoutubeShorts } from '../lib/feed';

export function Home() {
  const { currentUser, introPhase, setIntroPhase, isLoading } = useAppStore();
  const [videos, setVideos] = useState<(Video & { user: User; feedId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ytPageToken, setYtPageToken] = useState('');
  const seenFeedIds = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchBatch = async (isRefresh = false) => {
    if (loadingBatch) return;
    setLoadingBatch(true);
    
    try {
      const allDbVideos = await getVideos();
      const allUsers = await getUsers();
      const localViewed = (() => {
        try { return JSON.parse(localStorage.getItem('viewedVideos') || '[]') as string[]; }
        catch { return []; }
      })();
      const unseenUgvs = allDbVideos.filter(video => {
        if (video.isYouTube || seenFeedIds.current.has(video.id) || localViewed.includes(video.id)) return false;
        return !currentUser || !(video.viewedBy || []).includes(currentUser.id);
      }).map(v => ({
        ...v,
        videoUrl: v.videoData ? URL.createObjectURL(v.videoData) : v.videoUrl,
        user: allUsers.find(u => u.id === v.userId) || ({} as User)
      }));

      let nextVideo: Video & { user: User } | undefined = unseenUgvs[Math.floor(Math.random() * unseenUgvs.length)];
      let nextYtPageToken = ytPageToken;

      if (!nextVideo) {
        try {
          const interacted = allDbVideos.filter(video => currentUser && (
            video.likes?.includes(currentUser.id) ||
            currentUser.favorites?.includes(video.id) ||
            video.comments?.some(comment => comment.userId === currentUser.id)
          ));
          const tags = interacted.flatMap(video => video.tags || []);
          const preferredQuery = tags.length ? `${tags[Math.floor(Math.random() * tags.length)]} shorts` : 'shorts';
          const queries = Array.from(new Set([preferredQuery, 'youtube shorts', 'shorts']));
          for (const query of queries) {
            const youtubeParams = `pageToken=${encodeURIComponent(isRefresh ? '' : nextYtPageToken)}&q=${encodeURIComponent(query)}`;
            const youtubeUrl = import.meta.env.VITE_YOUTUBE_API_KEY
              ? `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&videoDuration=short&videoEmbeddable=true&safeSearch=moderate&key=${import.meta.env.VITE_YOUTUBE_API_KEY}&${youtubeParams}`
              : `/api/youtube-shorts?${youtubeParams}`;
            const response = await fetch(youtubeUrl);
            if (!response.ok) continue;
            const data = await response.json();
            nextYtPageToken = data.nextPageToken || '';
            const valid = normalizeYoutubeShorts(data.items || [], seenFeedIds.current)[0];
            if (valid) {
              nextVideo = {
                id: `yt_${valid.id.videoId}`,
                userId: 'youtube_user', videoUrl: '', description: valid.snippet.title,
                tags: ['#shorts', '#youtube'], likes: [], comments: [], timestamp: Date.now(),
                views: 0, filter: '', isYouTube: true, youtubeId: valid.id.videoId,
                user: {
                  id: 'youtube_user', email: `${valid.snippet.channelId}@youtube.local`, username: valid.snippet.channelTitle,
                  handle: valid.snippet.channelTitle.replace(/\s+/g, '').toLowerCase(),
                  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${valid.snippet.channelId}`,
                  bio: 'YouTube Creator', following: [], followers: [], isPrivate: false
                }
              };
              break;
            }
          }
        } catch (error) {
          console.warn('YouTube Shorts request failed', error);
        }
      }

      setYtPageToken(nextYtPageToken);
      const mixedWithFeedIds = nextVideo ? [{ ...nextVideo, feedId: Math.random().toString(36).substring(2, 9) }] : [];
      mixedWithFeedIds.forEach(video => seenFeedIds.current.add(video.id));

      if (isRefresh) {
        setVideos(mixedWithFeedIds);
        setHasMore(Boolean(nextVideo) || Boolean(nextYtPageToken));
      } else {
        setVideos(prev => {
          const newVideos = mixedWithFeedIds.filter(newVid => !prev.some(p => p.id === newVid.id));
          return [...prev, ...newVideos];
        });
        setHasMore(Boolean(nextVideo) || Boolean(nextYtPageToken));
      }
    } catch (err) {
      console.error("fetchBatch error:", err);
      setHasMore(false);
    } finally {
      setLoadingBatch(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    seenFeedIds.current.clear();
    setVideos([]);
    setYtPageToken('');
    setHasMore(true);
    fetchBatch(true);
  }, [currentUser?.id, isLoading]);

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
      if (entries[0].isIntersecting && !loadingBatch && hasMore) {
        fetchBatch();
      }
    });
    if (endRef.current) observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [loadingBatch, hasMore]);

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

  const scrollUp = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -containerRef.current.clientHeight, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: containerRef.current.clientHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollDown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className="relative h-full w-full flex justify-center bg-black md:bg-zinc-950">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full w-full max-w-[500px] snap-y snap-mandatory overflow-y-scroll hide-scrollbar pb-16 md:pb-0 relative bg-black"
      >
        {refreshing && (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 p-2 rounded-full shadow-lg text-pink-600 animate-spin">
              <Loader2 size={24} />
            </div>
          </div>
        )}
        {videos.map((video, index) => (
          <VideoItem 
            key={video.feedId} 
            video={video} 
          />
        ))}
        {hasMore ? (
          <div ref={endRef} className="h-20 snap-start flex items-center justify-center bg-black shrink-0">
            <Loader2 size={32} className="animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="h-20 snap-start flex items-center justify-center bg-black shrink-0 text-zinc-500 text-sm pb-8">
            You've caught up for now!
          </div>
        )}
      </motion.div>
      
      {/* Desktop Navigation Arrows */}
      <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col gap-4">
        <button 
          onClick={scrollUp}
          className="p-4 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full transition-colors drop-shadow-xl"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button 
          onClick={scrollDown}
          className="p-4 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full transition-colors drop-shadow-xl"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export const VideoItem: React.FC<{ video: Video & { user: User; feedId: string } }> = ({ video }) => {
  const { currentUser, setCurrentUser } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLiked, setIsLiked] = useState(video.likes?.includes(currentUser?.id || '') || false);
  const [likesCount, setLikesCount] = useState(video.likes?.length || 0);
  const [isFavorited, setIsFavorited] = useState(currentUser?.favorites?.includes(video.id) || false);
  const [views, setViews] = useState(video.views || 0);
  const [hasViewed, setHasViewed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [youtubeError, setYoutubeError] = useState<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (video.isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
            try {
              ytPlayerRef.current.playVideo();
            } catch (err) {}
          } else if (videoRef.current && typeof videoRef.current.play === 'function') {
            videoRef.current.play().catch(() => {});
          }
          if (!video.isYouTube) setIsPlaying(true);
          setIsActive(true);
          
          if (!hasViewed) {
            setHasViewed(true);
            let localViewed: string[] = [];
            try { localViewed = JSON.parse(localStorage.getItem('viewedVideos') || '[]'); } catch (e) {}
            
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
          if (video.isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          } else if (videoRef.current && typeof videoRef.current.pause === 'function') {
            videoRef.current.pause();
          }
          setIsPlaying(false);
          setIsActive(false);
        }
      });
    }, { threshold: 0.6 });
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasViewed, video.id, currentUser, video.isYouTube]);

  const handleYtReady = (e: YouTubeEvent) => {
    ytPlayerRef.current = e.target;
    if (isPlaying && typeof e.target.playVideo === 'function') {
      try { e.target.playVideo(); } catch (err) {}
    }
  };

  const handleYtStateChange = (e: YouTubeEvent) => {
    setIsPlaying(e.data === 1);
  };

  const togglePlay = () => {
    if (video.isYouTube && ytPlayerRef.current) {
      if (isPlaying && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try { ytPlayerRef.current.pauseVideo(); } catch (err) {}
      } else if (!isPlaying && typeof ytPlayerRef.current.playVideo === 'function') {
        try { ytPlayerRef.current.playVideo(); } catch (err) {}
      }
    } else if (videoRef.current) {
      if (isPlaying && typeof videoRef.current.pause === 'function') videoRef.current.pause();
      else if (!isPlaying && typeof videoRef.current.play === 'function') videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isActive && e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isPlaying, togglePlay]);

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

  const submitReport = async () => {
    if (!currentUser || !reportReason) return;
    const reports = await getReports();
    reports.push({
      id: `rep_${Date.now()}`,
      videoId: video.id,
      reporterId: currentUser.id,
      reason: reportReason,
      status: 'pending',
      timestamp: Date.now()
    });
    await saveReports(reports);
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReport(false);
      setReportSubmitted(false);
      setReportReason('');
    }, 2000);
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
      enablejsapi: 1,
      origin: window.location.origin,
      mute: 1,
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
        youtubeError ? (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-white">
            <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="YouTube Short thumbnail" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            <div className="relative z-10">
              <p className="font-semibold">This Short cannot be embedded.</p>
              <a href={`https://www.youtube.com/shorts/${video.youtubeId}`} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg bg-pink-600 px-4 py-2 font-semibold">Watch on YouTube</a>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <YouTube 
              videoId={video.youtubeId} 
              opts={opts} 
              onReady={handleYtReady}
              onStateChange={handleYtStateChange}
              onError={(event) => setYoutubeError(event.data)}
              className="w-full h-full" 
              iframeClassName="w-full h-full object-contain" 
            />
          </div>
        )
      ) : video.videoUrl && (video.videoUrl.endsWith('.mp4') || video.videoUrl.startsWith('blob:')) ? (
        <video 
          ref={videoRef}
          src={video.videoUrl}
          className={`w-full h-full object-contain bg-black ${video.filter || ''}`}
          loop
          playsInline
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
        />
      ) : video.videoUrl ? (
        <div className="w-full h-full bg-black flex items-center justify-center" onClick={togglePlay}>
          <img src={video.videoUrl} alt="Video fallback" className={`w-full h-full object-contain opacity-50 ${video.filter || ''}`} />
        </div>
      ) : (
        <div className="w-full h-full bg-zinc-900 flex items-center justify-center" onClick={togglePlay}>
          <Loader2 size={32} className="text-pink-600 animate-spin" />
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
          <Link to={`/profile/${video.user?.handle || ''}`}>
            {video.user?.avatarUrl ? (
              <img src={video.user.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white bg-zinc-800 object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-white bg-zinc-800 flex items-center justify-center">
                <UserIcon size={24} className="text-zinc-500" />
              </div>
            )}
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

        {currentUser && (
          <button className="flex flex-col items-center gap-1 text-white drop-shadow-md mt-2" onClick={() => setShowReport(true)}>
            <div className="p-2 rounded-full bg-zinc-800/40 text-zinc-300 hover:text-red-500 transition-colors">
              <Flag size={22} />
            </div>
            <span className="text-[10px] font-semibold">Report</span>
          </button>
        )}
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

      {showReport && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 dark:text-white">Report Video</h3>
            {reportSubmitted ? (
              <div className="text-center py-8 text-green-600 font-medium">
                Thank you. Your report has been submitted for review.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Please select a reason for reporting this video.</p>
                <select 
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent dark:text-white"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Spam or misleading">Spam or misleading</option>
                  <option value="Inappropriate content">Inappropriate content</option>
                  <option value="Harassment or bullying">Harassment or bullying</option>
                  <option value="Harmful or dangerous acts">Harmful or dangerous acts</option>
                  <option value="Copyright violation">Copyright violation</option>
                </select>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowReport(false)} className="flex-1 py-3 rounded-xl font-semibold bg-zinc-100 dark:bg-zinc-800 dark:text-white">Cancel</button>
                  <button 
                    onClick={submitReport} 
                    disabled={!reportReason}
                    className="flex-1 py-3 rounded-xl font-semibold bg-pink-600 text-white disabled:opacity-50"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
