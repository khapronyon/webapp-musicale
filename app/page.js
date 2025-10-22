'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from './components/Header';
import Footer from './components/Footer';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      loadRecentReleases(user);
    } else {
      setLoading(false);
    }
  }

  async function loadRecentReleases(user) {
    setLoading(true);
    try {
      // Ottieni artisti seguiti
      const { data: followedArtists } = await supabase
        .from('followed_artists')
        .select('artist_id, artist_name, artist_image')
        .eq('user_id', user.id)
        .limit(5); // Prendi solo i primi 5 artisti per velocità

      if (!followedArtists || followedArtists.length === 0) {
        setReleases([]);
        setLoading(false);
        return;
      }

      // Ottieni release per ogni artista
      const allReleases = [];
      for (const artist of followedArtists) {
        try {
          const response = await fetch(`/api/spotify/artist-releases?artist_id=${artist.artist_id}`);
          const data = await response.json();

          if (data.releases && data.releases.length > 0) {
            const releasesWithArtist = data.releases.map(release => ({
              ...release,
              artistName: artist.artist_name,
              artistImage: artist.artist_image,
            }));
            allReleases.push(...releasesWithArtist);
          }
        } catch (error) {
          console.error(`Errore release per ${artist.artist_name}:`, error);
        }
      }

      // Ordina per data e prendi solo le prime 6
      allReleases.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      setReleases(allReleases.slice(0, 6));
    } catch (error) {
      console.error('Errore caricamento release:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'} fa`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'settimana' : 'settimane'} fa`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'mese' : 'mesi'} fa`;
    }
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  function getTypeColor(type) {
    const colors = {
      'album': 'bg-purple-100 text-purple-700',
      'single': 'bg-blue-100 text-blue-700',
      'compilation': 'bg-green-100 text-green-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  }

  function getTypeLabel(type) {
    const labels = {
      'album': 'Album',
      'single': 'Singolo',
      'compilation': 'Compilation'
    };
    return labels[type] || type;
  }

  const sections = [
    {
      title: 'Artisti',
      icon: '🎤',
      description: 'Cerca e segui i tuoi artisti preferiti',
      path: '/artists',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Release',
      icon: '💿',
      description: 'Nuove uscite degli artisti che segui',
      path: '/releases',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'News',
      icon: '📰',
      description: 'Ultime notizie dal mondo della musica',
      path: '/news',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Concerti',
      icon: '🎸',
      description: 'Scopri i prossimi eventi live',
      path: '/concerts',
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Merch',
      icon: '👕',
      description: 'Merchandising ufficiale',
      path: '/merch',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Benvenuto su MusicHub 🎵
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            La tua piattaforma per scoprire musica, seguire artisti e rimanere aggiornato
          </p>
        </div>

        {/* Latest Releases Section */}
        {user && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Ultime Release</h2>
                <p className="text-gray-600">Dalle tue band preferite</p>
              </div>
              <button
                onClick={() => router.push('/releases')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
              >
                Vedi tutte →
              </button>
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2 animate-bounce">🎵</div>
                <p className="text-gray-500">Caricamento...</p>
              </div>
            )}

            {!loading && releases.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-4xl mb-3">🎤</p>
                <p className="text-gray-600 mb-4">
                  Segui alcuni artisti per vedere le loro ultime release qui!
                </p>
                <button
                  onClick={() => router.push('/artists')}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Cerca Artisti
                </button>
              </div>
            )}

            {!loading && releases.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {releases.map((release) => (
                  <a
                    key={release.id}
                    href={release.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group"
                  >
                    {/* Cover Image */}
                    <div className="aspect-square overflow-hidden bg-gray-200 relative">
                      {release.image ? (
                        <img
                          src={release.image}
                          alt={release.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          💿
                        </div>
                      )}
                      {/* NEW badge */}
                      {(() => {
                        const releaseDate = new Date(release.releaseDate);
                        const now = new Date();
                        const diffDays = Math.ceil((now - releaseDate) / (1000 * 60 * 60 * 24));
                        return diffDays <= 30 && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            NEW
                          </div>
                        );
                      })()}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-1 ${getTypeColor(release.type)}`}>
                        {getTypeLabel(release.type)}
                      </span>
                      <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">
                        {release.name}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {release.artistName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(release.releaseDate)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Cards */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Esplora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <button
                key={section.path}
                onClick={() => router.push(section.path)}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden text-left"
              >
                <div className={`h-32 bg-gradient-to-br ${section.color} flex items-center justify-center text-6xl`}>
                  {section.icon}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition">
                    {section.title}
                  </h3>
                  <p className="text-gray-600">
                    {section.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}