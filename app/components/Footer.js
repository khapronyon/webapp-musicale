'use client';

import { useRouter } from 'next/navigation';
import { Mic2, Disc3, Newspaper, Guitar, ShoppingBag } from 'lucide-react';

export default function Footer() {
  const router = useRouter();

  const mainLinks = [
    { icon: ShoppingBag, label: 'Merch', path: '/merch' },
    { icon: Guitar, label: 'Concerts', path: '/concerts' },
    { icon: Mic2, label: 'Artists', path: '/artists' },
    { icon: Disc3, label: 'Release', path: '/releases' },
    { icon: Newspaper, label: 'News', path: '/news' },
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
                className="flex flex-col items-center text-white hover:text-secondary-light transition group"
              >
                <IconComponent 
                  size={32} 
                  strokeWidth={2}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="text-xs font-medium mt-1">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}