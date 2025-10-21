'use client';

import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <button 
          onClick={() => router.push('/')}
          className="text-2xl font-bold text-purple-500 hover:text-purple-400 transition-colors"
        >
          MusicHub
        </button>
        <div className="flex gap-4">
          <button className="hover:text-purple-400 relative transition-colors">
            🔔
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>
          <button className="hover:text-purple-400 transition-colors">
            👤
          </button>
        </div>
      </div>
    </header>
  );
}