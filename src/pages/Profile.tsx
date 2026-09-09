import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUsers, getVideos, saveUsers } from '../lib/db';
import { User, Video } from '../types';
import { useAppStore } from '../store';
import { Settings, Play, Edit3, Grid, Heart, X, Upload, Bookmark, Flag } from 'lucide-react';
import { VideoItem } from './Home';

export function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const { currentUser, setCurrentUser } = useAppStore();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'liked' | 'favorites'>('videos');
  const [showEdit, setShowEdit] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const users = await getUsers();
      const user = users.find(u => u.handle === handle);
      if (user) {
        setProfileUser(user);
        setIsFollowing(currentUser?.following.includes(user.id) || false);
        
        const allVideos = await getVideos();
        const userVideos = allVideos.filter(v => v.userId === user.id);
        const userLikedVideos = allVideos.filter(v => v.likes.includes(user.id));
        const userFavoriteVideos = allVideos.filter(v => user.favorites?.includes(v.id));
        
        const fixUrl = (v: Video) => ({
          ...v,
          videoUrl: v.videoData ? URL.createObjectURL(v.videoData) : v.videoUrl
        });
        
        setVideos(userVideos.map(fixUrl).sort((a, b) => b.timestamp - a.timestamp));
        setLikedVideos(userLikedVideos.map(fixUrl).sort((a, b) => b.timestamp - a.timestamp));
        setFavoriteVideos(userFavoriteVideos.map(fixUrl).sort((a, b) => b.timestamp - a.timestamp));
      }
      setLoading(false);
    };
    loadProfile();
  }, [handle, currentUser, showEdit]);

  const handleFollow = async () => {
    if (!currentUser || !profileUser) return;
    
    const users = await getUsers();
    const currentIdx = users.findIndex(u => u.id === currentUser.id);
    const profileIdx = users.findIndex(u => u.id === profileUser.id);
    
    if (isFollowing) {
      users[currentIdx].following = users[currentIdx].following.filter(id => id !== profileUser.id);
      users[profileIdx].followers = users[profileIdx].followers.filter(id => id !== currentUser.id);
    } else {
      users[currentIdx].following.push(profileUser.id);
      users[profileIdx].followers.push(currentUser.id);
    }
    
    await saveUsers(users);
    setCurrentUser(users[currentIdx]);
    setProfileUser(users[profileIdx]);
    setIsFollowing(!isFollowing);
  };

  const handleReport = () => {
    alert(`User ${profileUser?.username} has been reported. Our team will review this account.`);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!profileUser) return <div className="p-8 text-center text-zinc-500">User not found</div>;

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="w-full h-full overflow-y-auto hide-scrollbar pb-24 md:pb-0">
      <div className="max-w-4xl mx-auto border-x border-zinc-200 dark:border-zinc-800 min-h-screen">
        
        {/* Profile Header */}
        <div className="px-4 pt-12 pb-6 flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-zinc-200 dark:border-zinc-800">
          <img src={profileUser.avatarUrl} alt={profileUser.username} className="w-28 h-28 rounded-full border-2 border-zinc-200 dark:border-zinc-800 object-cover" />
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{profileUser.username}</h1>
            <p className="text-zinc-500 font-semibold mb-4">@{profileUser.handle}</p>
            
            <div className="flex items-center justify-center md:justify-start gap-6 mb-4">
              <div className="text-center">
                <span className="font-bold block">{profileUser.following.length}</span>
                <span className="text-zinc-500 text-sm">Following</span>
              </div>
              <div className="text-center">
                <span className="font-bold block">{profileUser.followers.length}</span>
                <span className="text-zinc-500 text-sm">Followers</span>
              </div>
              <div className="text-center">
                <span className="font-bold block">{videos.reduce((acc, v) => acc + (v.likes?.length || 0), 0)}</span>
                <span className="text-zinc-500 text-sm">Likes</span>
              </div>
            </div>
            
            <p className="mb-4 whitespace-pre-wrap">{profileUser.bio}</p>
            
            <div className="flex items-center justify-center md:justify-start gap-2">
              {isOwnProfile ? (
                <>
                  <button onClick={() => setShowEdit(true)} className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 font-semibold rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2">
                    <Edit3 size={18} /> Edit profile
                  </button>
                  <button onClick={() => setShowEdit(true)} className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 font-semibold rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <Settings size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleFollow}
                    className={`px-8 py-2 font-semibold rounded-md transition-colors ${
                      isFollowing 
                        ? 'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900' 
                        : 'bg-pink-600 text-white hover:bg-pink-700'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <Link to={`/messages/${profileUser.handle}`} className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 font-semibold rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    Message
                  </Link>
                  <button onClick={handleReport} className="px-4 py-2 border border-red-200 text-red-500 dark:border-red-900/50 dark:text-red-400 font-semibold rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center">
                    <Flag size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === 'videos' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-500'}`}
          >
            <Grid size={20} /> Videos
          </button>
          {(!profileUser.isPrivate || isOwnProfile || isFollowing) && (
            <button 
              onClick={() => setActiveTab('liked')}
              className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === 'liked' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-500'}`}
            >
              <Heart size={20} /> Liked
            </button>
          )}
          {isOwnProfile && (
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${activeTab === 'favorites' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-500'}`}
            >
              <Bookmark size={20} /> Favorites
            </button>
          )}
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-3 gap-0.5 md:gap-1 p-0.5 md:p-1">
          {(activeTab === 'videos' ? videos : activeTab === 'liked' ? likedVideos : favoriteVideos).map(video => (
            <div key={video.id} onClick={() => setSelectedVideo(video)} className="aspect-[3/4] relative bg-black group cursor-pointer overflow-hidden">
              <video src={video.videoUrl} className={`w-full h-full object-cover ${video.filter || ''}`} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white font-semibold text-sm drop-shadow-md">
                <Play size={16} className="fill-current" />
                <span>{video.views || 0}</span>
              </div>
            </div>
          ))}
          {(activeTab === 'videos' ? videos : activeTab === 'liked' ? likedVideos : favoriteVideos).length === 0 && (
            <div className="col-span-3 py-20 text-center text-zinc-500">
              No videos found in this tab.
            </div>
          )}
        </div>

      </div>
      
      {showEdit && currentUser && (
        <EditProfileModal user={currentUser} onClose={() => setShowEdit(false)} />
      )}

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
            {/* Find the user who posted the video since the selected video might belong to someone else (if in liked/favorites tab) */}
            <VideoItem video={{...selectedVideo, user: profileUser}} />
          </div>
        </div>
      )}
    </div>
  );
}

function EditProfileModal({ user, onClose }: { user: User, onClose: () => void }) {
  const { setCurrentUser } = useAppStore();
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], username, bio, isPrivate, avatarUrl };
      await saveUsers(users);
      setCurrentUser(users[idx]);
    }
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setAvatarUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700" />
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Upload size={24} />
              </div>
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
            <p className="mt-2 text-sm text-pink-600 font-semibold cursor-pointer" onClick={() => fileRef.current?.click()}>Change photo</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Username</label>
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500 rounded-lg px-4 py-2 outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500 rounded-lg px-4 py-2 outline-none transition-all resize-none h-24"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Private Account</p>
              <p className="text-sm text-zinc-500">Only approved followers can see your videos.</p>
            </div>
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-pink-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
