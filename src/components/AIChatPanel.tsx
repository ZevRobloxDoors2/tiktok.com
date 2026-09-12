import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Loader2, Sparkles } from 'lucide-react';
import { Video } from '../types';

interface AIChatPanelProps {
  video: Video;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ video, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', parts: [{ text: input.trim() }] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          prompt: userMsg.parts[0].text,
          videoContext: {
            description: video.description || video.title || 'Unknown Video',
            tags: video.tags || [],
            isYouTube: video.isYouTube,
            youtubeId: video.youtubeId
          }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch AI response');
      const data = await response.json();

      setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.response }] }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "I'm sorry, I encountered an error answering your question. Please try again." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[65vh] bg-white dark:bg-zinc-950 rounded-t-3xl z-40 flex flex-col pointer-events-auto border-t border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
      <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-2 text-pink-600 font-bold text-lg">
          <Sparkles className="fill-current" size={24} />
          <span>Ask AI</span>
        </div>
        <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center text-center text-zinc-500 gap-4">
            <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-pink-600">
              <Bot size={32} />
            </div>
            <p className="max-w-[250px]">
              Hi! I've watched this video. Ask me anything about it or any other topic!
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === 'user' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black rounded-br-sm' 
                  : 'bg-zinc-100 dark:bg-zinc-900 rounded-bl-sm text-zinc-800 dark:text-zinc-200'
              }`}>
                {m.parts[0].text}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-bl-sm">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this video..." 
            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-full py-3 pl-4 pr-12 focus:ring-2 focus:ring-pink-500 outline-none"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-1 p-2 bg-pink-600 text-white rounded-full disabled:opacity-50 hover:bg-pink-700 transition-colors"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
