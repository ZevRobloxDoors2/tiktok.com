import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { saveVideos, getVideos } from '../lib/db';
import { Video } from '../types';
import { Upload as UploadIcon, X, Video as VideoIcon, Camera } from 'lucide-react';

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
  const [mode, setMode] = useState<'upload' | 'record' | 'screen'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [filter, setFilter] = useState('');
  
  // Recording states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return <div className="p-8 text-center">Please log in to upload videos.</div>;
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
          alert('Could not access camera or microphone.');
          setMode('upload');
        });
    } else if (mode === 'screen' && !stream) {
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then(s => {
          setStream(s);
          if (cameraRef.current) cameraRef.current.srcObject = s;
          
          // Stop stream when user stops sharing via browser UI
          s.getVideoTracks()[0].onended = () => {
            s.getTracks().forEach(track => track.stop());
            setStream(null);
            setMode('upload');
          };
        })
        .catch(err => {
          alert('Could not access screen recording.');
          setMode('upload');
        });
    } else if (mode === 'upload' && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [mode, stream]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setFile(blob as File);
      setPreviewUrl(URL.createObjectURL(blob));
      setMode('upload'); // Go back to upload mode to show preview and edit caption
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('video/')) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      alert('Please select a valid video file.');
    }
  };

  const handleUpload = async () => {
    if (!file || !previewUrl) return;
    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(r => setTimeout(r, 1500));
    
    // Parse tags explicitly from the tags input + description
    const descTags = description.split(' ').filter(t => t.startsWith('#'));
    const explicitTags = hashtags.split(' ').map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`).filter(t => t !== '#');
    const parsedTags = Array.from(new Set([...descTags, ...explicitTags]));
    
    const newVideo: Video = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      videoUrl: previewUrl, 
      videoData: file, // Store actual file so we can recreate object URL on load
      description,
      tags: parsedTags,
      likes: [],
      comments: [],
      timestamp: Date.now(),
      views: 0,
      filter: filter
    };
    
    const videos = await getVideos();
    await saveVideos([...videos, newVideo]);
    
    navigate('/');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 overflow-y-auto hide-scrollbar pb-24">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create video</h1>
          {!file && (
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button 
                onClick={() => setMode('upload')}
                className={`px-4 py-1.5 rounded-md font-semibold flex items-center gap-2 ${mode === 'upload' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'}`}
              >
                <UploadIcon size={18} /> Upload
              </button>
              <button 
                onClick={() => setMode('record')}
                className={`px-4 py-1.5 rounded-md font-semibold flex items-center gap-2 ${mode === 'record' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'}`}
              >
                <Camera size={18} /> Record
              </button>
              <button 
                onClick={() => setMode('screen')}
                className={`px-4 py-1.5 rounded-md font-semibold flex items-center gap-2 ${mode === 'screen' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'}`}
              >
                <VideoIcon size={18} /> Screen
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
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                  {isRecording ? (
                    <button onClick={stopRecording} className="w-16 h-16 bg-red-600 rounded-lg animate-pulse border-4 border-white shadow-lg" />
                  ) : (
                    <button onClick={startRecording} className="w-16 h-16 bg-red-500 rounded-full border-4 border-white shadow-lg hover:scale-105 transition-transform" />
                  )}
                </div>
              </div>
            ) : !file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-zinc-800 rounded-2xl h-[500px] flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                <UploadIcon size={48} className="text-zinc-400 mb-4" />
                <p className="font-bold text-lg mb-2">Select video to upload</p>
                <p className="text-zinc-500 text-sm mb-6 text-center px-4">Or drag and drop a file<br/>MP4 or WebM<br/>Up to 10 minutes</p>
                <button className="bg-pink-600 text-white px-8 py-2.5 rounded-lg font-semibold">Select file</button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="video/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden h-[500px] bg-black flex items-center justify-center">
                <video src={previewUrl!} className={`w-full h-full object-contain ${filter}`} controls autoPlay loop />
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 p-2 rounded-full backdrop-blur-sm transition-colors text-white z-10"
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
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <label className="block font-semibold mb-2">Caption</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 rounded-lg p-3 outline-none min-h-[120px] resize-none"
                placeholder="Description..."
                disabled={mode === 'record' || mode === 'screen'}
              />
            </div>
            
            <div>
              <label className="block font-semibold mb-2">Hashtags</label>
              <input 
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 rounded-lg p-3 outline-none"
                placeholder="funny trending dance (space separated)"
                disabled={mode === 'record' || mode === 'screen'}
              />
            </div>
            
            <div className="flex items-center gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <button 
                onClick={() => { setFile(null); setPreviewUrl(null); setDescription(''); setHashtags(''); setMode('upload'); }}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 py-3 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading || mode === 'record' || mode === 'screen'}
                className="flex-1 bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
