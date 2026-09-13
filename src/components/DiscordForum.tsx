import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getFAQCategories, saveFAQCategories, getFAQPosts, saveFAQPosts, deleteFAQPostFromDB, getUsers, announceForumPostToEveryone } from '../lib/db';
import { FAQCategory, FAQPost, FAQReply, User } from '../types';
import { 
  Hash, Search, Pin, MessageSquare, Plus, Settings, Trash2, Send, 
  Smile, ShieldCheck, Crown, ChevronLeft, Tag, X, Check, Filter
} from 'lucide-react';

const DEFAULT_CATEGORIES: FAQCategory[] = [
  { id: 'announcements', name: 'Announcements', icon: '📢', color: '#5865F2', description: 'Official updates from the owner and staff team' },
  { id: 'general', name: 'General FAQ', icon: '❓', color: '#57F287', description: 'Frequently asked questions about CentralTok' },
  { id: 'friends_privacy', name: 'Friends & Privacy', icon: '👥', color: '#FEE75C', description: 'How mutual follows, friend posts, and private videos work' },
  { id: 'stories_media', name: 'Stories & Camera', icon: '⚡', color: '#EB459E', description: '24-hour stories, switching between recording and images' },
  { id: 'moderation_safety', name: 'Rules & Bans', icon: '🛡️', color: '#ED4245', description: 'Staff guidelines, ban reason requirements, and appeals' }
];

const PRESET_COLORS = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#3BA55D', '#FAA61A', '#00A8FC'];

export function DiscordForum() {
  const { currentUser, setShowAuthModal } = useAppStore();
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [posts, setPosts] = useState<FAQPost[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<FAQPost | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  
  // Create Post Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  
  // Create Category Form
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📌');
  const [catColor, setCatColor] = useState('#5865F2');
  const [catDesc, setCatDesc] = useState('');

  const isOwner = currentUser?.role === 'owner';
  const isStaff = currentUser?.role === 'staff';
  const isStaffOrOwner = isOwner || isStaff;

  // Load data
  const loadForumData = async () => {
    const allUsers = await getUsers();
    setUsers(allUsers);
    
    let cats = await getFAQCategories();
    if (cats.length === 0) {
      cats = DEFAULT_CATEGORIES;
      await saveFAQCategories(cats);
    }
    setCategories(cats);
    if (!newCategory && cats.length > 0) {
      setNewCategory(cats[0].id);
    }

    let allPosts = await getFAQPosts();
    if (allPosts.length === 0) {
      // Seed initial helpful FAQs
      const initialPosts: FAQPost[] = [
        {
          id: 'faq_1',
          authorId: currentUser?.id || 'system_staff',
          title: '👥 How do Friends and Post Privacy (Friends / Only You / Everyone) work?',
          categoryId: 'friends_privacy',
          pinned: true,
          timestamp: Date.now() - 3600000 * 5,
          content: `On CentralTok, friendship is built on mutual connection!\n\n**Mutual Follows = Friends:**\nWhen you and another user both follow each other, you automatically become **Friends**. You will see a special Friends badge on their profile and in your interactions.\n\n**Post Privacy Options:**\nWhen uploading or recording a post, you can choose who can view it:\n- 🌐 **Everyone**: Your video or image is public and appears on the For You feed.\n- 👥 **Friends Only**: Only people who mutually follow you can view this post. Hidden from everyone else.\n- 🔒 **Only You**: Private post visible only to you on your profile.\n\n**Deleting Posts:**\nYou can delete any of your posts at any time from your profile grid or directly from the video player options!`,
          replies: [
            {
              id: 'rep_1',
              authorId: currentUser?.id || 'system_staff',
              content: 'If you unfollow someone, you will no longer be mutual friends and friend-only posts will be hidden automatically.',
              timestamp: Date.now() - 3600000 * 4
            }
          ],
          reactions: { '👍': ['user_1', 'user_2'], '❤️': ['user_1'] }
        },
        {
          id: 'faq_2',
          authorId: currentUser?.id || 'system_staff',
          title: '⚡ Stories Feature & Switching between Camera, Video, and Image',
          categoryId: 'stories_media',
          pinned: true,
          timestamp: Date.now() - 3600000 * 3,
          content: `You can now share **24-Hour Stories** as well as standard Feed posts!\n\n**Switching Media Types:**\n- 🔴 **Record**: Switch to your live camera to record video with a live timer, or tap the photo shutter to snap an instant photo!\n- 🖼️ **Image**: Upload photos, memes, or pictures directly from your device.\n- 🎥 **Video**: Upload pre-recorded MP4/WebM videos.\n- 💻 **Screen**: Capture your screen.\n\n**Stories Bar:**\nYour stories appear in the top Stories Bar on the Home feed with a glowing gradient ring and automatically disappear after 24 hours. You can view who seen your story!`,
          replies: [],
          reactions: { '⚡': ['user_1'], '🔥': ['user_2'] }
        },
        {
          id: 'faq_3',
          authorId: currentUser?.id || 'system_staff',
          title: '🛡️ Mandatory Ban Reasons & Unban Transparency Policy',
          categoryId: 'moderation_safety',
          pinned: false,
          timestamp: Date.now() - 3600000 * 2,
          content: `All moderation actions on CentralTok are held to strict accountability standards.\n\n**Staff Reason Requirements:**\n- When staff or owner bans any user (temporary, permanent, or hardware enforcement), a specific, documented reason MUST be provided.\n- When a user is unbanned (either directly or via appeal), staff MUST provide a detailed explanation why they are getting unbanned.\n- If an appeal is rejected, staff MUST provide a mandatory reason explaining why the user remains banned.\n\nAll reasons are displayed transparently to the user on their ban screen and logged in the immutable moderation audit log.`,
          replies: [],
          reactions: { '🛡️': ['user_1', 'user_2'] }
        }
      ];
      allPosts = initialPosts;
      await saveFAQPosts(initialPosts);
    }
    setPosts(allPosts);
  };

  useEffect(() => {
    loadForumData();
  }, []);

  // Filtered posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = !activeCategoryId || post.categoryId === activeCategoryId;
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  const getCategory = (catId: string) => categories.find(c => c.id === catId);
  const getAuthor = (authorId: string) => users.find(u => u.id === authorId);

  // Handle creating post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaffOrOwner || !currentUser) return;
    if (!newTitle.trim() || !newContent.trim() || !newCategory) return;

    const newPost: FAQPost = {
      id: `faq_${Date.now()}`,
      authorId: currentUser.id,
      title: newTitle.trim(),
      categoryId: newCategory,
      content: newContent.trim(),
      pinned: isPinned,
      timestamp: Date.now(),
      replies: [],
      reactions: {}
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    await saveFAQPosts(updated);

    // Announce to all users in the system; offline users will receive it when they come online
    await announceForumPostToEveryone(newPost, currentUser);

    setNewTitle('');
    setNewContent('');
    setIsPinned(false);
    setShowCreateModal(false);
  };

  // Handle adding category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaffOrOwner) return;
    if (!catName.trim()) return;

    const id = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newCat: FAQCategory = {
      id: `${id}_${Date.now()}`,
      name: catName.trim(),
      icon: catIcon.trim() || '📌',
      color: catColor,
      description: catDesc.trim()
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    await saveFAQCategories(updated);

    setCatName('');
    setCatDesc('');
  };

  // Handle deleting category
  const handleDeleteCategory = async (catId: string) => {
    if (!isStaffOrOwner) return;
    if (categories.length <= 1) {
      alert("At least one category is required.");
      return;
    }
    const updated = categories.filter(c => c.id !== catId);
    setCategories(updated);
    await saveFAQCategories(updated);
    if (activeCategoryId === catId) setActiveCategoryId(null);
  };

  // Handle deleting post
  const handleDeletePost = async (postId: string) => {
    if (!isStaffOrOwner) return;
    if (!window.confirm("Are you sure you want to delete this FAQ thread?")) return;
    
    await deleteFAQPostFromDB(postId);
    const updated = posts.filter(p => p.id !== postId);
    setPosts(updated);
    if (selectedPost?.id === postId) setSelectedPost(null);
  };

  // Handle adding reply
  const handleAddReply = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!replyText.trim() || !selectedPost) return;

    const newReply: FAQReply = {
      id: `rep_${Date.now()}`,
      authorId: currentUser.id,
      content: replyText.trim(),
      timestamp: Date.now()
    };

    const updatedPost: FAQPost = {
      ...selectedPost,
      replies: [...(selectedPost.replies || []), newReply]
    };

    const updatedAll = posts.map(p => p.id === updatedPost.id ? updatedPost : p);
    setPosts(updatedAll);
    setSelectedPost(updatedPost);
    await saveFAQPosts(updatedAll);
    setReplyText('');
  };

  // Handle emoji reaction
  const handleReact = async (postId: string, emoji: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    const target = posts.find(p => p.id === postId);
    if (!target) return;

    const reactions = { ...(target.reactions || {}) };
    const currentList = reactions[emoji] || [];
    const hasReacted = currentList.includes(currentUser.id);

    if (hasReacted) {
      reactions[emoji] = currentList.filter(uid => uid !== currentUser.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...currentList, currentUser.id];
    }

    const updatedPost = { ...target, reactions };
    const updatedAll = posts.map(p => p.id === postId ? updatedPost : p);
    setPosts(updatedAll);
    if (selectedPost?.id === postId) setSelectedPost(updatedPost);
    await saveFAQPosts(updatedAll);
  };

  return (
    <div className="w-full bg-[#1e1f22] text-zinc-100 rounded-2xl overflow-hidden shadow-2xl border border-[#2b2d31] font-sans">
      
      {/* Discord-style Forum Header */}
      <div className="bg-[#2b2d31] border-b border-[#1f2023] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white font-bold text-xl shadow-md">
            <Hash size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">faq-and-announcements</h2>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-[#35373c] text-zinc-400 border border-zinc-700">Forum</span>
            </div>
            <p className="text-xs text-zinc-400">Official answers, guides, and feature updates from staff & owner</p>
          </div>
        </div>

        {/* Action Controls for Staff/Owner */}
        <div className="flex items-center gap-2 flex-wrap">
          {isStaffOrOwner && (
            <>
              <button
                onClick={() => setShowCategoriesModal(true)}
                className="px-3.5 py-2 bg-[#35373c] hover:bg-[#404249] text-zinc-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                title="Customize Forum Categories"
              >
                <Settings size={14} /> Manage Categories
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-all hover:scale-[1.02]"
              >
                <Plus size={16} /> New FAQ Post
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Forum Content */}
      <div className="p-4 md:p-6 space-y-6">

        {/* If viewing a single thread */}
        {selectedPost ? (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Back button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] transition-colors w-max"
            >
              <ChevronLeft size={16} /> Back to all discussions
            </button>

            {/* Thread Original Post */}
            <div className="bg-[#2b2d31] border border-[#35373c] rounded-2xl p-6 shadow-md relative">
              {/* Category tag & Pin badge */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {selectedPost.pinned && (
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-600/40 px-2.5 py-0.5 rounded-full">
                    <Pin size={12} /> Pinned
                  </span>
                )}
                {(() => {
                  const cat = getCategory(selectedPost.categoryId);
                  return cat ? (
                    <span 
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border"
                      style={{ backgroundColor: `${cat.color}20`, borderColor: `${cat.color}60`, color: cat.color }}
                    >
                      <span>{cat.icon || '🏷️'}</span> {cat.name}
                    </span>
                  ) : null;
                })()}

                {isStaffOrOwner && (
                  <button
                    onClick={() => handleDeletePost(selectedPost.id)}
                    className="ml-auto text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#35373c] transition-colors"
                    title="Delete Thread"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl md:text-2xl font-extrabold text-white mb-4 leading-snug">
                {selectedPost.title}
              </h1>

              {/* Author Row */}
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#35373c]/70">
                {(() => {
                  const author = getAuthor(selectedPost.authorId);
                  const isOwnerPost = author?.role === 'owner';
                  const isStaffPost = author?.role === 'staff';
                  return (
                    <>
                      {author?.avatarUrl ? (
                        <img src={author.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white">
                          {author?.username?.charAt(0) || 'S'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{author?.username || 'Staff Team'}</span>
                          {isOwnerPost ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/50">
                              <Crown size={11} /> Owner
                            </span>
                          ) : isStaffPost ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                              <ShieldCheck size={11} /> Staff
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#35373c] text-zinc-400">
                              Member
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {new Date(selectedPost.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selectedPost.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Body Content */}
              <div className="text-zinc-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap mb-6">
                {selectedPost.content}
              </div>

              {/* Reactions Bar */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#35373c]/50">
                {['👍', '❤️', '💡', '🔥', '🎉'].map(emoji => {
                  const count = selectedPost.reactions?.[emoji]?.length || 0;
                  const active = currentUser && selectedPost.reactions?.[emoji]?.includes(currentUser.id);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(selectedPost.id, emoji)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                        active 
                          ? 'bg-[#5865F2]/20 border-[#5865F2] text-white' 
                          : 'bg-[#232428] border-zinc-800 text-zinc-300 hover:bg-[#35373c]'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="font-bold">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Replies Section */}
            <div className="bg-[#2b2d31] border border-[#35373c] rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} /> Discussion & Comments ({selectedPost.replies?.length || 0})
              </h3>

              {/* Replies List */}
              <div className="space-y-3">
                {selectedPost.replies?.map(reply => {
                  const repAuthor = getAuthor(reply.authorId);
                  const isRepOwner = repAuthor?.role === 'owner';
                  const isRepStaff = repAuthor?.role === 'staff';
                  return (
                    <div key={reply.id} className="p-3.5 bg-[#232428] border border-[#35373c]/60 rounded-xl flex gap-3">
                      {repAuthor?.avatarUrl ? (
                        <img src={repAuthor.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-zinc-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {repAuthor?.username?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-xs text-white">@{repAuthor?.handle || 'user'}</span>
                          {isRepOwner && (
                            <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-red-900/60 text-red-300 border border-red-700/50">
                              Owner
                            </span>
                          )}
                          {isRepStaff && (
                            <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                              Staff
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-500">
                            {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  );
                })}
                {(!selectedPost.replies || selectedPost.replies.length === 0) && (
                  <p className="text-xs text-zinc-500 py-3 italic">No comments yet. Have a question? Post a reply below.</p>
                )}
              </div>

              {/* Reply Composer */}
              <div className="pt-3 border-t border-[#35373c] flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddReply(); }}
                  placeholder={`Message #${selectedPost.title.slice(0, 24)}...`}
                  className="flex-1 bg-[#1e1f22] border border-[#35373c] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5865F2]"
                />
                <button
                  onClick={handleAddReply}
                  disabled={!replyText.trim()}
                  className="px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Send size={15} /> Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search and Category Filter Bar */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search FAQ titles, keywords, or guides..."
                  className="w-full bg-[#2b2d31] border border-[#35373c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5865F2] transition-colors"
                />
              </div>

              {/* Category Tags Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  onClick={() => setActiveCategoryId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                    activeCategoryId === null 
                      ? 'bg-white text-zinc-950 border-white font-bold' 
                      : 'bg-[#2b2d31] text-zinc-300 border-[#35373c] hover:bg-[#35373c]'
                  }`}
                >
                  All Categories ({posts.length})
                </button>
                {categories.map(cat => {
                  const isActive = activeCategoryId === cat.id;
                  const catPostCount = posts.filter(p => p.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                        isActive 
                          ? 'text-white shadow-sm' 
                          : 'bg-[#2b2d31] text-zinc-300 border-[#35373c] hover:bg-[#35373c]'
                      }`}
                      style={isActive ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                    >
                      <span>{cat.icon || '🏷️'}</span>
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-70">({catPostCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posts Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map(post => {
                const cat = getCategory(post.categoryId);
                const author = getAuthor(post.authorId);
                const isOwnerPost = author?.role === 'owner';
                const isStaffPost = author?.role === 'staff';
                const replyCount = post.replies?.length || 0;
                
                return (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="bg-[#2b2d31] hover:bg-[#35373c] border border-[#35373c] hover:border-[#5865F2]/50 rounded-2xl p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      {/* Top tags */}
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        {post.pinned && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-400 bg-amber-950/40 border border-amber-600/40 px-2 py-0.5 rounded-md">
                            <Pin size={11} /> Pinned
                          </span>
                        )}
                        {cat && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border"
                            style={{ backgroundColor: `${cat.color}20`, borderColor: `${cat.color}60`, color: cat.color }}
                          >
                            <span>{cat.icon || '🏷️'}</span> {cat.name}
                          </span>
                        )}
                      </div>

                      {/* Post Title */}
                      <h3 className="font-bold text-white text-base md:text-lg mb-2 group-hover:text-[#5865F2] transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      {/* Content Preview */}
                      <p className="text-xs text-zinc-300 line-clamp-3 mb-4 leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-3 border-t border-[#35373c]/60 flex items-center justify-between text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        {author?.avatarUrl ? (
                          <img src={author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#5865F2] text-white text-[10px] flex items-center justify-center font-bold">
                            {author?.username?.charAt(0) || 'S'}
                          </div>
                        )}
                        <span className="font-semibold text-zinc-300">@{author?.handle || 'staff'}</span>
                        {isOwnerPost && <Crown size={12} className="text-red-400" title="Owner" />}
                        {isStaffPost && <ShieldCheck size={12} className="text-blue-400" title="Staff" />}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={13} /> {replyCount}
                        </span>
                        <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPosts.length === 0 && (
                <div className="col-span-full py-16 text-center text-zinc-400">
                  <Hash size={36} className="mx-auto mb-2 text-zinc-600" />
                  <p className="font-semibold text-base">No FAQ threads found.</p>
                  <p className="text-xs text-zinc-500 mt-1">Try searching for a different keyword or view all categories.</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Modal: Create New FAQ Thread */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#313338] border border-[#3d3f45] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#3d3f45] pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Plus size={18} className="text-[#5865F2]" /> New FAQ Post (Staff / Owner)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Post Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. How to get verified / How friends work..."
                  className="w-full bg-[#1e1f22] border border-[#3d3f45] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#3d3f45] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🏷️'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Content / Answer</label>
                <textarea
                  required
                  rows={6}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Type the full FAQ guidance, details, or announcement..."
                  className="w-full bg-[#1e1f22] border border-[#3d3f45] rounded-xl p-3.5 text-sm text-white resize-none focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5865F2] focus:ring-0 bg-[#1e1f22] border-zinc-700"
                />
                <label htmlFor="pinCheck" className="text-xs font-semibold text-zinc-300 cursor-pointer flex items-center gap-1">
                  <Pin size={13} className="text-amber-400" /> Pin this thread to top of forum
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-zinc-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-sm font-semibold transition-colors shadow"
                >
                  Publish FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customize Categories */}
      {showCategoriesModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#313338] border border-[#3d3f45] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
            <div className="flex items-center justify-between border-b border-[#3d3f45] pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Settings size={18} className="text-[#5865F2]" /> Manage Forum Categories
              </h3>
              <button onClick={() => setShowCategoriesModal(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-zinc-400">Current Categories</label>
              {categories.map(c => (
                <div key={c.id} className="p-3 bg-[#232428] rounded-xl border border-[#3d3f45] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{c.icon || '🏷️'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      </div>
                      {c.description && <p className="text-[11px] text-zinc-400">{c.description}</p>}
                    </div>
                  </div>
                  {categories.length > 1 && (
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#35373c] transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Category */}
            <form onSubmit={handleAddCategory} className="pt-3 border-t border-[#3d3f45] space-y-3">
              <label className="block text-xs font-bold uppercase text-zinc-400">Create New Category</label>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] text-zinc-400 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={catIcon}
                    onChange={e => setCatIcon(e.target.value)}
                    className="w-full bg-[#1e1f22] border border-[#3d3f45] rounded-xl p-2 text-center text-sm text-white"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    placeholder="e.g. Creator Tools"
                    className="w-full bg-[#1e1f22] border border-[#3d3f45] rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Tag Color</label>
                <div className="flex gap-2 items-center flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ 
                        backgroundColor: color, 
                        borderColor: catColor === color ? '#ffffff' : 'transparent' 
                      }}
                    >
                      {catColor === color && <Check size={12} className="text-black stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  placeholder="Short description of this category topic"
                  className="w-full bg-[#1e1f22] border border-[#3d3f45] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-xs font-bold transition-colors"
              >
                + Add Category
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
