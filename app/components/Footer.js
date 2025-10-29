'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic2, Disc3, Newspaper, Guitar, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Footer() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Ottenere utente corrente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Polling per badge notifiche ogni 60 secondi
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          limit: 1,
          unreadOnly: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const mainLinks = [
    { icon: ShoppingBag, label: 'Merch', path: '/merch' },
    { icon: Guitar, label: 'Concerts', path: '/concerts' },
    { icon: Mic2, label: 'Artists', path: '/artists' },
    { icon: Disc3, label: 'Release', path: '/releases' },
    { icon: Newspaper, label: 'News', path: '/news', badge: unreadCount },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary-dark to-primary shadow-2xl border-t-4 border-secondary z-50">
      <div className="max-w-7xl mx-auto px-2">
        {/* Mobile Navigation Bar */}
        <div className="flex items-center justify-around py-3">
          {mainLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => router.push(link.path)}
                className="flex flex-col items-center text-white hover:text-secondary-light transition group relative"
              >
                <div className="relative">
                  <IconComponent 
                    size={32} 
                    strokeWidth={2}
                    className="group-hover:scale-110 transition-transform"
                  />
                  
                  {/* Badge notifiche - appare SOLO se > 0 */}
                  {link.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                      {link.badge > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium mt-1">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}