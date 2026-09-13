import React from 'react';
import { Bold, Italic, Strikethrough, Code, Quote, Heading, List, Eye, Edit3 } from 'lucide-react';

interface ForumToolbarProps {
  onInsert: (prefix: string, suffix?: string, defaultText?: string) => void;
  isPreview: boolean;
  onTogglePreview: () => void;
}

export function ForumToolbar({ onInsert, isPreview, onTogglePreview }: ForumToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-1 py-1.5 px-2 bg-[#1e1f22] border-b border-[#35373c] rounded-t-xl text-xs text-zinc-400">
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => onInsert('**', '**', 'bold text')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Bold (**text**)"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => onInsert('*', '*', 'italic text')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Italic (*text*)"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => onInsert('~~', '~~', 'strikethrough')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Strikethrough (~~text~~)"
        >
          <Strikethrough size={14} />
        </button>
        <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
        <button
          type="button"
          onClick={() => onInsert('`', '`', 'code')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Inline Code (`code`)"
        >
          <Code size={14} />
        </button>
        <button
          type="button"
          onClick={() => onInsert('> ', '', 'Quoted text')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Quote (> text)"
        >
          <Quote size={14} />
        </button>
        <button
          type="button"
          onClick={() => onInsert('### ', '', 'Section Title')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Heading (### text)"
        >
          <Heading size={14} />
        </button>
        <button
          type="button"
          onClick={() => onInsert('- ', '', 'List item')}
          className="p-1.5 hover:text-white hover:bg-[#35373c] rounded transition-colors"
          title="Bullet list (- item)"
        >
          <List size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-zinc-500 hidden sm:inline mr-2">Enter = new line</span>
        <button
          type="button"
          onClick={onTogglePreview}
          className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
            isPreview ? 'bg-[#5865F2] text-white' : 'bg-[#2b2d31] hover:bg-[#35373c] text-zinc-300'
          }`}
        >
          {isPreview ? <Edit3 size={12} /> : <Eye size={12} />}
          <span>{isPreview ? 'Write' : 'Preview'}</span>
        </button>
      </div>
    </div>
  );
}

// Parses inline formatting: **bold**, *italic*, ~~strike~~, `code`, and links
function parseInline(text: string): React.ReactNode[] {
  // Regex to match markdown tokens
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through text-zinc-400">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="bg-[#1e1f22] text-amber-300 px-1.5 py-0.5 rounded font-mono text-xs border border-zinc-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Markdown link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5865F2] hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Plain URL
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5865F2] hover:underline break-all"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export function ForumRichText({ content, className = '' }: { content: string; className?: string }) {
  if (!content) return null;

  // Split into lines preserving formatting
  const lines = content.split('\n');

  return (
    <div className={`space-y-1.5 leading-relaxed break-words font-normal ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line -> vertical rhythm space
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Headings: ### Header, ## Header, # Header
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-white pt-2 pb-1 border-b border-zinc-800">
              {parseInline(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-extrabold text-white pt-2.5 pb-1 border-b border-zinc-800">
              {parseInline(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl font-black text-white pt-3 pb-1 border-b border-zinc-700">
              {parseInline(line.slice(2))}
            </h1>
          );
        }

        // Blockquote: > quote
        if (line.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-[#5865F2] pl-3 py-1 bg-[#1e1f22]/70 text-zinc-300 italic rounded-r my-1"
            >
              {parseInline(line.slice(2))}
            </blockquote>
          );
        }

        // List item: - item or * item
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-3">
              <span className="text-[#5865F2] text-sm leading-6">•</span>
              <div className="flex-1 text-zinc-200">{parseInline(line.slice(2))}</div>
            </div>
          );
        }

        // Standard paragraph line
        return (
          <p key={idx} className="text-zinc-200">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
}
