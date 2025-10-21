'use client';

import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  const router = useRouter();

  const sections = [
    { icon: "🎵", title: "Release", description: "Nuove uscite dei tuoi artisti", path: "/releases" },
    { icon: "📰", title: "News", description: "Ultime notizie musicali", path: "/news" },
    { icon: "🎤", title: "Concerti", description: "Eventi live in arrivo", path: "/concerts" },
    { icon: "🛍️", title: "Merch", description: "Shop ufficiale artisti", path: "/merch" },
    { icon: "⭐", title: "Artisti", description: "Gestisci i tuoi preferiti", path: "/artists" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">
          Benvenuto nella tua Webapp Musicale! 🎵
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Il tuo hub personalizzato per seguire i tuoi artisti preferiti.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {sections.map((section) => (
            <button
              key={section.title}
              onClick={() => router.push(section.path)}
              className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-purple-500 transition-all hover:scale-105 text-left"
            >
              <div className="text-4xl mb-3">{section.icon}</div>
              <h3 className="text-xl font-bold mb-2">{section.title}</h3>
              <p className="text-gray-400">{section.description}</p>
            </button>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}