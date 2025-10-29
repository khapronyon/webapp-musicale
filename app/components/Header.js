'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    router.push('/');
  }

  return (
    <header className="bg-gradient-to-r from-primary to-primary-light shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="text-white hover:scale-110 transition-transform"
          >
            <span className="text-4xl">🎵</span>
          </button>

          {/* Right Side: Notifications + User */}
          <div className="flex items-center gap-4">
            {/* Notifications - Sostituito con NotificationDropdown */}
            {user && <NotificationDropdown user={user} />}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="text-white hover:scale-110 transition-transform"
                >
                  <User size={28} strokeWidth={2} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 border-2 border-primary-light">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/artists');
                      }}
                      className="w-full text-left px-4 py-2 text-neutral-dark hover:bg-primary-light hover:bg-opacity-10 transition"
                    >
                      I Miei Artisti
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/releases');
                      }}
                      className="w-full text-left px-4 py-2 text-neutral-dark hover:bg-primary-light hover:bg-opacity-10 transition"
                    >
                      Le Mie Release
                    </button>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition font-medium"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-secondary hover:bg-secondary-light text-white font-bold px-6 py-2 rounded-full transition hover:scale-105 shadow-lg"
              >
                Accedi
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}