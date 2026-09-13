import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { saveVideos, getVideos, getStories, saveStories } from '../lib/db';
import { Video, Story } from '../types';
import { 
  Upload as UploadIcon, X, Video as VideoIcon, Camera, Image as ImageIcon, 
  Users, Lock, Globe, Zap, CircleDot, Disc
} from 'lucide-react';

const FILTERS = [
  { name: 'Normal', class: '' },
  { name: 'Grayscale', class: 'grayscale' },
  { name: 'Sepia', class: 'sepia' },
  { name: 'Vivid', class: 'saturate-150 contrast-110' },
  { name: 'Cool', class: 'hue-rotate-90' }
];

export function Upload() {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const [postTarget, setPostTarget] = useState<'feed' | 'story'>('feed');
  const [mode, setMode] = useState<'video' | 'image' | 'record' | 'screen'>('video');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [file, setFile] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [visibility, setVisibility] = useState<'everyone' | 'friends' | 'only_you'>('everyone');
  const [isUploading, setIsUploading] = useState(false);
  const [filter, setFilter] = useState('');
  
  // Recording states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return <div className="p-8 text-center">Please log in to create posts and stories.</div>;
  }

  // Handle switching to camera or screen
  useEffect(() => {
    if (mode === 'record' && !stream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(s => {
          setStream(s);
          if (cameraRef.current) cameraRef.current.srcObject = s;
        })
        .catch(err => {
          console.warn('Camera error:', err);
          alert('Could not access camera or microphone.');
          setMode('video');
        });
    } else if (mode === 'screen' && !stream) {
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then(s => {
          setStream(s);
          if (cameraRef.current) cameraRef.current.srcObject = s;
          
          s.getVideoTracks()[0].onended = () => {
            s.getTracks().forEach(track => track.stop());
            setStream(null);
            setMode('video');
          };
        })
        .catch(err => {
          console.warn('Screen recording error:', err);
          alert('Could not access screen recording.');
          setMode('video');
        });
    } else if ((mode === 'video' || mode === 'image') && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [mode, stream]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setFile(blob);
      setMediaType('video');
      setPreviewUrl(URL.createObjectURL(blob));
      setMode('video');
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
    setRecordDuration(0);
    timerRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // Instant photo snap from live camera
  const snapPhoto = () => {
    if (!cameraRef.current) return;
    const video = cameraRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setFile(blob);
        setMediaType('image');
        setPreviewUrl(URL.createObjectURL(blob));
        setMode('image');
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type.startsWith('image/')) {
      setFile(selected);
      setMediaType('image');
      setPreviewUrl(URL.createObjectURL(selected));
    } else if (selected.type.startsWith('video/')) {
      setFile(selected);
      setMediaType('video');
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      alert('Please select a valid image or video file.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    try {
      let downloadUrl = '';

      // Try uploading to cloud service if available
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'centraltok');
        const uploadEndpoint = mediaType === 'image' ? 'image' : 'video';
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/nmdsqhos/${uploadEndpoint}/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          downloadUrl = data.secure_url;
        }
      } catch (cloudErr) {
        console.warn("Cloudinary upload omitted or failed, storing media locally:", cloudErr);
      }

      // If cloud upload wasn't used or failed, fall back to base64 DataURL
      if (!downloadUrl) {
        downloadUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const descTags = description.split(' ').filter(t => t.startsWith('#'));
      const explicitTags = hashtags.split(' ').map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`).filter(t => t !== '#');
      const parsedTags = Array.from(new Set([...descTags, ...explicitTags]));

      if (postTarget === 'story') {
        // Save as 24-Hour Story
        const stories = await getStories();
        const newStory: Story = {
          id: `story_${Date.now()}`,
          userId: currentUser.id,
          mediaUrl: downloadUrl,
          mediaType: mediaType,
          caption: description,
          timestamp: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          visibility: visibility,
          viewers: []
        };
        await saveStories([newStory, ...stories]);
        navigate('/');
      } else {
        // Save as Feed Post
        const newVideo: Video = {
          id: `post_${Date.now()}`,
          userId: currentUser.id,
          videoUrl: downloadUrl, 
          description,
          tags: parsedTags,
          likes: [],
          comments: [],
          timestamp: Date.now(),
          views: 0,
          filter: filter,
          mediaType: mediaType,
          visibility: visibility
        };
        
        const videos = await getVideos();
        await saveVideos([newVideo, ...videos]);
        navigate('/');
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Posting failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 overflow-y-auto hide-scrollbar pb-24">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
        
        {/* Post Destination: Feed vs Story */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Create</h1>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setPostTarget('feed')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  postTarget === 'feed' ? 'bg-pink-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                📱 Feed Post
              </button>
              <button
                onClick={() => setPostTarget('story')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  postTarget === 'story' ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Zap size={13} /> 24h Story
              </button>
            </div>
          </div>

          {/* Mode Switcher: Video, Image, Record, Screen */}
          {!file && (
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => { setMode('record'); setMediaType('video'); }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${mode === 'record' ? 'bg-white dark:bg-zinc-700 shadow-sm text-pink-600 dark:text-pink-400' : 'text-zinc-500'}`}
              >
                <Camera size={15} /> Record Camera
              </button>
              <button 
                onClick={() => { setMode('image'); setMediaType('image'); }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${mode === 'image' ? 'bg-white dark:bg-zinc-700 shadow-sm text-pink-600 dark:text-pink-400' : 'text-zinc-500'}`}
              >
                <ImageIcon size={15} /> Image
              </button>
              <button 
                onClick={() => { setMode('video'); setMediaType('video'); }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${mode === 'video' ? 'bg-white dark:bg-zinc-700 shadow-sm text-pink-600 dark:text-pink-400' : 'text-zinc-500'}`}
              >
                <UploadIcon size={15} /> Video
              </button>
              <button 
                onClick={() => { setMode('screen'); setMediaType('video'); }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${mode === 'screen' ? 'bg-white dark:bg-zinc-700 shadow-sm text-pink-600 dark:text-pink-400' : 'text-zinc-500'}`}
              >
                <VideoIcon size={15} /> Screen
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Visual Area */}
          <div className="flex-1">
            {mode === 'record' || mode === 'screen' ? (
              <div className="relative rounded-2xl overflow-hidden h-[500px] bg-black flex items-center justify-center">
                <video ref={cameraRef} autoPlay muted playsInline className={`w-full h-full object-cover ${filter}`} />
                
                {/* Recording Duration Indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <CircleDot size={12} /> {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                  </div>
                )}

                {/* Shutter controls: Record Video and Snap Photo */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 z-10">
                  {/* Snap Photo Button */}
                  {!isRecording && (
                    <button 
                      onClick={snapPhoto} 
                      className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all flex flex-col items-center gap-1"
                      title="Snap Instant Photo"
                    >
                      <Camera size={22} />
                      <span className="text-[10px] font-bold">Photo</span>
                    </button>
                  )}

                  {/* Record Video Button */}
                  {isRecording ? (
                    <button 
                      onClick={stopRecording} 
                      className="w-16 h-16 bg-red-600 rounded-2xl animate-pulse border-4 border-white shadow-2xl flex items-center justify-center text-white"
                      title="Stop Recording"
                    >
                      <Disc size={28} />
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording} 
                      className="w-16 h-16 bg-red-500 rounded-full border-4 border-white shadow-2xl hover:scale-105 transition-transform flex items-center justify-center text-white"
                      title="Start Recording Video"
                    >
                      <CircleDot size={28} />
                    </button>
                  )}
                </div>
              </div>
            ) : !file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-zinc-800 rounded-2xl h-[500px] flex flex-col items-center justify-center cursor-pointer transition-colors p-6"
              >
                {mode === 'image' ? (
                  <>
                    <ImageIcon size={48} className="text-zinc-400 mb-4" />
                    <p className="font-bold text-lg mb-2">Select image or photo</p>
                    <p className="text-zinc-500 text-sm mb-6 text-center">PNG, JPG, JPEG, WEBP or GIF<br/>High resolution supported</p>
                    <button className="bg-pink-600 text-white px-8 py-2.5 rounded-lg font-semibold">Select image</button>
                  </>
                ) : (
                  <>
                    <UploadIcon size={48} className="text-zinc-400 mb-4" />
                    <p className="font-bold text-lg mb-2">Select video to upload</p>
                    <p className="text-zinc-500 text-sm mb-6 text-center">MP4, WebM or MOV<br/>Up to 10 minutes</p>
                    <button className="bg-pink-600 text-white px-8 py-2.5 rounded-lg font-semibold">Select video</button>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept={mode === 'image' ? "image/*" : "video/*"} 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden h-[500px] bg-black flex items-center justify-center">
                {mediaType === 'image' ? (
                  <img src={previewUrl!} alt="" className={`w-full h-full object-contain ${filter}`} />
                ) : (
                  <video src={previewUrl!} className={`w-full h-full object-contain ${filter}`} controls autoPlay loop />
                )}
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 p-2 rounded-full backdrop-blur-sm transition-colors text-white z-10"
                  title="Remove media"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Filters Row */}
            {(mode === 'record' || mode === 'screen' || file) && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Effects & Filters</p>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                  {FILTERS.map(f => (
                    <button 
                      key={f.name}
                      onClick={() => setFilter(f.class)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.class ? 'bg-pink-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Form Area */}
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <label className="block font-semibold mb-2">Caption / Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 rounded-lg p-3 outline-none min-h-[100px] resize-none text-sm"
                placeholder={postTarget === 'story' ? "Add a story caption..." : "Write a caption for your post..."}
                disabled={mode === 'record' || mode === 'screen'}
              />
            </div>
            
            {postTarget === 'feed' && (
              <div>
                <label className="block font-semibold mb-2 text-sm">Hashtags</label>
                <input 
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 rounded-lg p-3 outline-none text-sm"
                  placeholder="trending comedy viral (space separated)"
                  disabled={mode === 'record' || mode === 'screen'}
                />
              </div>
            )}

            {/* Post Visibility Selector */}
            <div>
              <label className="block font-semibold mb-2 text-sm">Who can view this {postTarget === 'story' ? 'story' : 'post'}?</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('everyone')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    visibility === 'everyone' 
                      ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Globe size={14} /> Everyone
                  </div>
                  <span className="text-[10px] font-normal opacity-80">Public feed</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('friends')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    visibility === 'friends' 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Users size={14} /> Friends
                  </div>
                  <span className="text-[10px] font-normal opacity-80">Mutual follows</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('only_you')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    visibility === 'only_you' 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Lock size={14} /> Only you
                  </div>
                  <span className="text-[10px] font-normal opacity-80">Private archive</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <button 
                onClick={() => { setFile(null); setPreviewUrl(null); setDescription(''); setHashtags(''); setMode('video'); }}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 py-3 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading || mode === 'record' || mode === 'screen'}
                className="flex-1 bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {isUploading ? 'Posting...' : postTarget === 'story' ? 'Post to Story' : 'Post Video'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
