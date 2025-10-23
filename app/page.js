'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from './components/Header';
import Footer from './components/Footer';

const CACHE_KEY = 'releases_cache'; // STESSA CACHE della pagina Release!
const CACHE_DURATION = 30 * 60 * 1000; // 30 minuti

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

  function loadFromCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        console.log('✅ Homepage: Cache valida! Caricamento istantaneo');
        return data;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  function saveToCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Errore cache:', error);
    }
  }

  async function loadRecentReleases(user) {
    try {
      // 1. PROVA CACHE (INSTANT!)
      const cachedReleases = loadFromCache();
      if (cachedReleases && cachedReleases.length > 0) {
        // Filtra solo ultimi 30 giorni e prendi prime 5
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const recentFromCache = cachedReleases
          .filter(r => new Date(r.releaseDate) >= thirtyDaysAgo)
          .slice(0, 5);

        setReleases(recentFromCache);
        setLoading(false);
        
        // Continua in background per aggiornare cache se necessario
        return;
      }

      // 2. Nessuna cache valida - carica da API
      console.log('🔄 Homepage: Carico da API...');
      
      const { data: followedArtists } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id)
        .limit(10); // Limita a 10 artisti per velocità homepage

      if (!followedArtists || followedArtists.length === 0) {
        setReleases([]);
        setLoading(false);
        return;
      }

      // CHIAMATE PARALLELE
      const promises = followedArtists.map(artist => 
        fetch(`/api/spotify/artist-releases?artist_id=${artist.artist_id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.releases) {
              return data.releases.map(release => ({
                ...release,
                artist_name: artist.artist_name,
                artist_id: artist.artist_id,
                artist_image: artist.artist_image,
              }));
            }
            return [];
          })
          .catch(() => [])
      );

      const results = await Promise.all(promises);
      const allReleases = results.flat();

      // Filtra ultimi 30 giorni
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const recentReleases = allReleases
        .filter(r => new Date(r.releaseDate) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
        .filter((release, index, self) => 
          index === self.findIndex(r => r.id === release.id)
        );

      // Salva tutte le release in cache per la pagina Release
      saveToCache(recentReleases);

      // Mostra solo prime 5 sulla homepage
      setReleases(recentReleases.slice(0, 5));

    } catch (error) {
      console.error('Errore homepage:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'settimana' : 'settimane'} fa`;
    }
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  function isNew(releaseDate) {
    const release = new Date(releaseDate);
    const now = new Date();
    const daysDiff = Math.floor((now - release) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  }

  function openRelease(release) {
    window.open(release.spotifyUrl, '_blank');
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-secondary flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-4">🎵 Benvenuto!</h1>
          <p className="text-xl mb-8">La tua app per seguire i tuoi artisti preferiti</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-8 py-3 bg-white text-primary rounded-lg font-bold hover:bg-opacity-90 transition"
            >
              Accedi
            </button>
            <button
              onClick={() => router.push('/auth/register')}
              className="px-8 py-3 bg-secondary text-white rounded-lg font-bold hover:bg-secondary-light transition"
            >
              Registrati
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-dark mb-2">
            Ciao! 👋
          </h1>
          <p className="text-gray-600">
            Ecco le ultime novità dai tuoi artisti preferiti
          </p>
        </div>

        {/* Latest Releases Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-neutral-dark">Nuove Release</h2>
            <button
              onClick={() => router.push('/releases')}
              className="text-primary hover:text-primary-dark font-medium transition"
            >
              Vedi tutte →
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border-2 border-primary-light">
              <p className="text-6xl mb-4">🎵</p>
              <h3 className="text-xl font-bold text-neutral-dark mb-2">
                Nessuna release recente
              </h3>
              <p className="text-gray-600 mb-4">
                Segui alcuni artisti per vedere le loro ultime uscite!
              </p>
              <button
                onClick={() => router.push('/artists')}
                className="px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition"
              >
                Vai agli Artisti
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {releases.map((release) => {
                const releaseType = release.type?.toLowerCase() || '';
                const isAlbum = releaseType === 'album' || releaseType === 'compilation';
                
                return (
                  <div
                    key={release.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group cursor-pointer border-2 border-transparent hover:border-primary relative"
                    onClick={() => openRelease(release)}
                  >
                    {/* Badge NEW */}
                    {isNew(release.releaseDate) && (
                      <div className="absolute top-2 right-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded-full z-10 animate-pulse">
                        NEW
                      </div>
                    )}

                    {/* Cover */}
                    <div className="aspect-square overflow-hidden bg-gray-200">
                      <img
                        src={release.image}
                        alt={release.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      {/* Badge Type */}
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded mb-2 ${
                        isAlbum
                          ? 'bg-primary text-white'
                          : 'bg-secondary text-white'
                      }`}>
                        {release.type}
                      </span>

                      {/* Title */}
                      <h3 className="font-bold text-neutral-dark text-sm mb-1 line-clamp-2">
                        {release.name}
                      </h3>

                      {/* Artist */}
                      <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                        {release.artist_name}
                      </p>

                      {/* Date */}
                      <p className="text-xs text-gray-500">
                        {formatDate(release.releaseDate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/artists')}
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition border-2 border-transparent hover:border-primary text-left"
          >
            <div className="text-4xl mb-2">🎤</div>
            <h3 className="text-xl font-bold text-neutral-dark mb-1">Artisti</h3>
            <p className="text-gray-600 text-sm">Cerca e segui i tuoi preferiti</p>
          </button>

          <button
            onClick={() => router.push('/releases')}
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition border-2 border-transparent hover:border-primary text-left"
          >
            <div className="text-4xl mb-2">🎵</div>
            <h3 className="text-xl font-bold text-neutral-dark mb-1">Release</h3>
            <p className="text-gray-600 text-sm">Tutte le ultime uscite</p>
          </button>

          <button
            onClick={() => router.push('/news')}
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition border-2 border-transparent hover:border-secondary text-left"
          >
            <div className="text-4xl mb-2">📰</div>
            <h3 className="text-xl font-bold text-neutral-dark mb-1">News</h3>
            <p className="text-gray-600 text-sm">Ultime notizie musicali</p>
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}