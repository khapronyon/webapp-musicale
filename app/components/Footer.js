'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();

  const sections = [
    { icon: "🛍️", label: "Merch", path: "/merch" },
    { icon: "🎤", label: "Concerti", path: "/concerts" },
    { icon: "⭐", label: "Artisti", path: "/artists", featured: true },
    { icon: "🎵", label: "Release", path: "/releases" },
    { icon: "📰", label: "News", path: "/news" },
  ];

  const handleNavigation = (path) => {
    router.push(path);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          {sections.map((section) => {
            const isActive = pathname === section.path;
            
            return (
              <button
                key={section.label}
                onClick={() => handleNavigation(section.path)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  section.featured ? "scale-125" : ""
                } ${
                  isActive ? "text-purple-400" : "text-gray-400 hover:text-purple-400"
                }`}
              >
                <span className="text-2xl">{section.icon}</span>
                <span className={`text-xs ${section.featured ? "font-bold" : ""}`}>
                  {section.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}