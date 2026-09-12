import React, { useState } from 'react';
import { useAppStore } from '../store';
import { getUsers, saveUsers } from '../lib/db';

const TOPICS = [
  'Funny', 'Gaming', 'Building', 'Creative', 'Sports',
  'Music', 'Dance', 'Education', 'Vlogs', 'Fashion',
  'Science', 'Art', 'Animals', 'Food', 'Travel'
];

export function InterestsModal() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!currentUser || (currentUser.interests && currentUser.interests.length > 0)) {
    return null;
  }

  const toggleInterest = (topic: string) => {
    setSelected(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const allUsers = await getUsers();
      const idx = allUsers.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        allUsers[idx].interests = selected;
        await saveUsers(allUsers);
        setCurrentUser(allUsers[idx]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold mb-2">What do you like?</h2>
        <p className="text-zinc-500 mb-6">Select topics to personalize your For You feed.</p>
        
        <div className="flex flex-wrap gap-2 mb-8">
          {TOPICS.map(topic => {
            const isSelected = selected.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => toggleInterest(topic)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors border ${isSelected ? 'bg-pink-600 text-white border-pink-600' : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-pink-500'}`}
              >
                {topic}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={selected.length === 0 || loading}
          className="w-full bg-pink-600 text-white font-bold py-3 rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
