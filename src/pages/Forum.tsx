import React from 'react';
import { DiscordForum } from '../components/DiscordForum';

export function Forum() {
  return (
    <div className="w-full h-full overflow-y-auto bg-[#111214] text-white p-2 md:p-6 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto">
        <DiscordForum />
      </div>
    </div>
  );
}
