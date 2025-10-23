'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ReleasesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [releases, setReleases] = useState([]);
  const [filteredReleases, setFilteredReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    checkUserAndLoad();
  }, []);

  useEffect(() => {
    filterReleases();
  }, [releases, filterType]);

  async function checkUserAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
    loadReleases(user);
  }

  async function loadReleases(user) {
    setLoading(true);
    try {
      const { data: followedArtists } = await supabase
        .from('followed_artists')
        .select('artist_id, artist_name, artist_image')
        .eq('user_id', user.id);

      if (!followedArtists || followedArtists.length === 0) {
        setReleases([]);
        setLoading(false);
        return;
      }

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

      allReleases.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      setReleases(allReleases);
    } catch (error) {
      console.error('Errore caricamento release:', error);
      alert('Errore durante il caricamento delle release. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  function filterReleases() {
    if (filterType === 'all') {
      setFilteredReleases(releases);
    } else {
      setFilteredReleases(releases.filter(release => release.type === filterType));
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
    
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  function getTypeLabel(type) {
    const labels = {
      'album': 'Album',
      'single': 'Singolo',
      'compilation': 'Compilation'
    };
    return labels[type] || type;
  }

  function getTypeColor(type) {
    const colors = {
      'album': 'bg-primary text-white border-2 border-primary-dark',
      'single': 'bg-secondary text-white border-2 border-secondary',
      'compilation': 'bg-primary-dark text-white border-2 border-primary'
    };
    return colors[type] || 'bg-gray-500 text-white border-2 border-gray-700';
  }

  const stats = {
    total: releases.length,
    albums: releases.filter(r => r.type === 'album').length,
    singles: releases.filter(r => r.type === 'single').length,
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">Nuove Release</h1>
        <p className="text-gray-600 mb-8">
          Le ultime uscite degli artisti che segui
        </p>

        {!loading && releases.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 border-2 border-primary-light">
              <p className="text-gray-500 text-sm">Totale</p>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>
            <div className="bg-primary rounded-lg shadow-md p-4 border-2 border-primary-dark">
              <p className="text-white text-sm font-medium">Album</p>
              <p className="text-3xl font-bold text-white">{stats.albums}</p>
            </div>
            <div className="bg-secondary rounded-lg shadow-md p-4 border-2 border-secondary">
              <p className="text-white text-sm font-medium">Singoli</p>
              <p className="text-3xl font-bold text-white">{stats.singles}</p>
            </div>
          </div>
        )}

        {!loading && releases.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-dark hover:bg-primary-light hover:bg-opacity-20 border-2 border-primary-light'
              }`}
            >
              Tutti ({stats.total})
            </button>
            <button
              onClick={() => setFilterType('album')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'album'
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-dark hover:bg-primary-light hover:bg-opacity-20 border-2 border-primary-light'
              }`}
            >
              Album ({stats.albums})
            </button>
            <button
              onClick={() => setFilterType('single')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'single'
                  ? 'bg-secondary text-white'
                  : 'bg-white text-neutral-dark hover:bg-secondary hover:bg-opacity-20 border-2 border-secondary'
              }`}
            >
              Singoli ({stats.singles})
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🎵</div>
            <p className="text-gray-600">Caricamento release...</p>
          </div>
        )}

        {!loading && releases.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md border-2 border-primary-light">
            <p className="text-6xl mb-4">📀</p>
            <h2 className="text-xl font-bold text-neutral-dark mb-2">
              Nessuna release trovata
            </h2>
            <p className="text-gray-600 mb-6">
              Segui alcuni artisti per vedere le loro ultime uscite!
            </p>
            <button
              onClick={() => router.push('/artists')}
              className="px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-lg transition font-medium"
            >
              Cerca Artisti
            </button>
          </div>
        )}

        {!loading && releases.length > 0 && filteredReleases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-gray-500">
              Nessuna release trovata con questo filtro.
            </p>
          </div>
        )}

        {!loading && filteredReleases.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredReleases.map((release) => (
              <a
                key={release.id}
                href={release.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group border-2 border-transparent hover:border-primary"
              >
                <div className="aspect-square overflow-hidden bg-gray-200 relative">
                  {release.image ? (
                    <img
                      src={release.image}
                      alt={release.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      💿
                    </div>
                  )}
                  {(() => {
                    const releaseDate = new Date(release.releaseDate);
                    const now = new Date();
                    const diffDays = Math.ceil((now - releaseDate) / (1000 * 60 * 60 * 24));
                    return diffDays <= 30 && (
                      <div className="absolute top-2 right-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded-full">
                        NEW
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getTypeColor(release.type)}`}>
                    {getTypeLabel(release.type)}
                  </span>

                  <h3 className="font-bold text-neutral-dark text-sm mb-1 line-clamp-2">
                    {release.name}
                  </h3>

                  <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                    {release.artistName}
                  </p>

                  <p className="text-xs text-gray-400">
                    {formatDate(release.releaseDate)}
                  </p>

                  {release.totalTracks > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {release.totalTracks} brani
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}