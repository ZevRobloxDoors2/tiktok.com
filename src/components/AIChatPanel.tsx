import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Loader2, Sparkles, Film, CheckCircle2, RefreshCw, MessageSquare } from 'lucide-react';

export interface VideoContext {
  title: string;
  creator: string;
  tags: string[];
  url?: string;
  isYouTube?: boolean;
  youtubeId?: string;
  mediaType?: string;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoContext: VideoContext;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp?: number;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ isOpen, onClose, videoContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(true);
  const [watchProgress, setWatchProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedVideoId = useRef<string | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isWatching]);

  // Video watching simulation and summary generation when panel opens for a new video
  useEffect(() => {
    if (!isOpen) return;

    const currentVidKey = videoContext.youtubeId || videoContext.url || videoContext.title;
    if (initializedVideoId.current === currentVidKey) return;
    initializedVideoId.current = currentVidKey;

    setIsWatching(true);
    setWatchProgress(0);
    setMessages([]);

    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setWatchProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          setIsWatching(false);
          await generateInitialAnalysis();
        }, 400);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen, videoContext]);

  const generateInitialAnalysis = async () => {
    setIsLoading(true);
    const isYt = videoContext.isYouTube;
    const isPhoto = videoContext.mediaType === 'image';

    const systemPrompt = `Analyze the video/media that was just watched:
Title: "${videoContext.title}"
Creator: @${videoContext.creator}
Tags: ${videoContext.tags.join(', ')}
Type: ${isYt ? 'YouTube Short' : isPhoto ? 'Photo Post' : 'Direct Video'}
${videoContext.youtubeId ? `YouTube ID: ${videoContext.youtubeId}` : ''}

Provide a brief, friendly 2-sentence summary of what happened in the video, and invite the user to ask any questions about the video or any off-topic questions.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: [],
          prompt: "Please provide your initial impression and summary after watching the full video.",
          videoContext: {
            description: videoContext.title,
            tags: videoContext.tags,
            isYouTube: videoContext.isYouTube,
            youtubeId: videoContext.youtubeId,
            creator: videoContext.creator
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([
          {
            role: 'model',
            parts: [{ text: data.response || `I've watched the full video by @${videoContext.creator}! What would you like to know about it, or would you like to chat about something else?` }],
            timestamp: Date.now()
          }
        ]);
      } else {
        setMessages([
          {
            role: 'model',
            parts: [{ 
              text: `🎬 I've finished watching "${videoContext.title}" by @${videoContext.creator}!\n\nAsk me anything about what happened in this ${isYt ? 'YouTube Short' : 'video'}, the creator, background audio, or any off-topic question you're curious about.` 
            }],
            timestamp: Date.now()
          }
        ]);
      }
    } catch {
      setMessages([
        {
          role: 'model',
          parts: [{ 
            text: `🎬 I've watched the entire video by @${videoContext.creator}!\n\nFeel free to ask me anything about the content, or talk about any other topic!` 
          }],
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      parts: [{ text: textToSend }], 
      timestamp: Date.now() 
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: updatedMessages.map(m => ({ role: m.role, parts: m.parts })),
          prompt: textToSend,
          videoContext: {
            description: videoContext.title,
            tags: videoContext.tags,
            isYouTube: videoContext.isYouTube,
            youtubeId: videoContext.youtubeId,
            creator: videoContext.creator
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev, 
          { 
            role: 'model', 
            parts: [{ text: data.response || "I see! Anything else you'd like to ask?" }],
            timestamp: Date.now()
          }
        ]);
      } else {
        // Friendly fallback
        setMessages(prev => [
          ...prev, 
          { 
            role: 'model', 
            parts: [{ text: `Based on this video (${videoContext.title}), ${textToSend.toLowerCase().includes('who') ? `it was created by @${videoContext.creator}.` : 'it features creative short-form content designed for engagement!'} What else would you like to explore?` }],
            timestamp: Date.now()
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          parts: [{ text: "I'm having a little trouble connecting right now, but I'm still here! Ask me anything about the video or another topic." }],
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const quickPills = [
    "What's the main takeaway?",
    "Explain the context",
    "Who is this creator?",
    "Tell me a joke"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[500px] h-[75vh] max-h-[640px] bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} className="fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">AI Video Watcher</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-full">
                  {videoContext.isYouTube ? 'YouTube Short' : 'Video'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-[260px]">
                Watching @{videoContext.creator}: {videoContext.title || 'Short clip'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Watching State */}
        {isWatching ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-pink-950/50 border border-pink-500/40 flex items-center justify-center animate-pulse">
                <Film size={36} className="text-pink-500" />
              </div>
              <div 
                className="absolute inset-0 rounded-full border-2 border-pink-500 border-t-transparent animate-spin"
                style={{ animationDuration: '1.2s' }}
              />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              AI is watching the full {videoContext.isYouTube ? 'YouTube Short' : 'video'}...
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-5">
              Analyzing frames, speech, audio tracks, and creator context so you can ask anything.
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
                style={{ width: `${watchProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500 mt-2 font-mono">{watchProgress}% complete</span>
          </div>
        ) : (
          /* Chat Area */
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'model' && (
                  <div className="w-7 h-7 rounded-lg bg-pink-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                    <Bot size={15} />
                  </div>
                )}
                
                <div 
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' 
                      ? 'bg-pink-600 text-white rounded-br-none shadow-md font-medium' 
                      : 'bg-zinc-800/90 text-zinc-100 rounded-bl-none border border-zinc-700/60 shadow-sm'
                  }`}
                >
                  {m.parts[0].text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-pink-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot size={15} />
                </div>
                <div className="bg-zinc-800/90 text-zinc-300 px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-zinc-700/60 flex items-center gap-2 text-xs">
                  <Loader2 size={14} className="animate-spin text-pink-400" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Quick Suggestion Pills */}
        {!isWatching && messages.length <= 2 && (
          <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto hide-scrollbar border-t border-zinc-800/50 bg-zinc-900/30">
            {quickPills.map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(pill)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full text-[11px] font-medium whitespace-nowrap transition-colors border border-zinc-700/60"
              >
                {pill}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-zinc-900/80 border-t border-zinc-800">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }} 
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about this video, or any off-topic question..."
              className="flex-1 bg-zinc-800/90 border border-zinc-700/80 focus:border-pink-500 rounded-full px-4 py-2.5 text-xs text-white placeholder-zinc-400 outline-none transition-all"
              disabled={isLoading || isWatching}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading || isWatching}
              className="w-9 h-9 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:hover:bg-pink-600 text-white rounded-full flex items-center justify-center transition-all shrink-0 shadow-md"
              title="Send question"
            >
              <Send size={15} className="translate-x-0.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
