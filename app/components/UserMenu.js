'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);
      }
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (!user) {
    return (
      <button
        onClick={() => router.push('/auth/login')}
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-bold transition-colors"
      >
        Accedi
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:text-purple-400 transition-colors"
      >
        <span className="text-2xl">👤</span>
        <span className="text-sm hidden md:inline">{profile?.nickname || 'Utente'}</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-sm font-bold">{profile?.nickname}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-sm text-red-400"
            >
              🚪 Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}