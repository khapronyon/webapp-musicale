'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Calendar } from 'lucide-react';

const CACHE_KEY = 'releases_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minuti

export default function ReleasesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30');
  const [progressCount, setProgressCount] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
    loadReleases(user);
  }

  function loadFromCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Se cache è valida (< 30 min)
      if (age < CACHE_DURATION) {
        console.log('✅ Cache valida! Caricamento istantaneo');
        return data;
      }

      console.log('⏰ Cache scaduta, ricarico...');
      return null;
    } catch (error) {
      console.error('Errore cache:', error);
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
      console.error('Errore salvataggio cache:', error);
    }
  }

  async function loadReleases(user) {
    try {
      // 1. PROVA CACHE PRIMA (INSTANT!)
      const cachedReleases = loadFromCache();
      if (cachedReleases) {
        setReleases(cachedReleases);
        setLoading(false);
        // Continua a ricaricare in background per aggiornare
        loadReleasesFromAPI(user, true);
        return;
      }

      // 2. Nessuna cache, carica da API
      await loadReleasesFromAPI(user, false);

    } catch (error) {
      console.error('Errore caricamento release:', error);
      setLoading(false);
    }
  }

  async function loadReleasesFromAPI(user, isBackgroundUpdate) {
    try {
      // Ottieni artisti seguiti
      const { data: followedArtists } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id);

      if (!followedArtists || followedArtists.length === 0) {
        setLoading(false);
        return;
      }

      setTotalArtists(followedArtists.length);
      console.log(`📊 Caricamento ${followedArtists.length} artisti...`);

      // PROGRESSIVE LOADING - mostra man mano che arrivano
      const allReleases = [];
      let completed = 0;

      // Dividi in batch di 5 artisti
      const batchSize = 5;
      for (let i = 0; i < followedArtists.length; i += batchSize) {
        const batch = followedArtists.slice(i, i + batchSize);
        
        const promises = batch.map(artist => 
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

        const batchResults = await Promise.all(promises);
        const batchReleases = batchResults.flat();
        allReleases.push(...batchReleases);

        completed += batch.length;
        setProgressCount(completed);

        // Aggiorna UI progressivamente
        if (!isBackgroundUpdate) {
          const sorted = allReleases
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
            .filter((release, index, self) => 
              index === self.findIndex(r => r.id === release.id)
            );
          setReleases(sorted);
        }
      }

      // Finale
      const sortedReleases = allReleases
        .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
        .filter((release, index, self) => 
          index === self.findIndex(r => r.id === release.id)
        );

      setReleases(sortedReleases);
      saveToCache(sortedReleases);
      console.log(`✅ ${sortedReleases.length} release caricate e salvate in cache`);

    } catch (error) {
      console.error('Errore API:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredReleases() {
    let filtered = releases;

    // Filtro temporale
    if (timeFilter !== 'all') {
      const now = new Date();
      const days = parseInt(timeFilter);
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      filtered = filtered.filter(release => {
        const releaseDate = new Date(release.releaseDate);
        return releaseDate >= cutoffDate;
      });
    }

    // Filtro tipo
    if (filter === 'all') return filtered;
    
    return filtered.filter(release => {
      const type = release.type.toLowerCase();
      
      if (filter === 'albums') {
        return type === 'album' || type === 'compilation';
      }
      
      if (filter === 'singles') {
        return type === 'single';
      }
      
      return true;
    });
  }

  function getReleaseCounts() {
    const filtered = getFilteredReleases();
    
    const albums = filtered.filter(r => {
      const type = r.type.toLowerCase();
      return type === 'album' || type === 'compilation';
    }).length;

    const singles = filtered.filter(r => {
      const type = r.type.toLowerCase();
      return type === 'single';
    }).length;

    return { total: filtered.length, albums, singles };
  }

  function isNew(releaseDate) {
    const release = new Date(releaseDate);
    const now = new Date();
    const daysDiff = Math.floor((now - release) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  }

  async function openRelease(release) {
    if (user) {
      try {
        await supabase
          .from('viewed_releases')
          .insert({
            user_id: user.id,
            release_id: release.id,
            artist_id: release.artist_id,
          });
      } catch (error) {
        // Ignora
      }
    }
    window.open(release.spotifyUrl, '_blank');
  }

  const filteredReleases = getFilteredReleases();
  const counts = getReleaseCounts();

  // Loading con progress
  if (loading && releases.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <p className="text-gray-600 mb-2">Caricamento release...</p>
          {totalArtists > 0 && (
            <p className="text-sm text-gray-500">
              {progressCount} / {totalArtists} artisti
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-neutral-dark">Nuove Release</h1>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              Aggiornamento...
            </div>
          )}
        </div>
        <p className="text-gray-600 mb-8">Le ultime uscite degli artisti che segui</p>

        {releases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md border-2 border-primary-light">
            <p className="text-6xl mb-4">🎵</p>
            <h2 className="text-xl font-bold text-neutral-dark mb-2">
              Nessuna release disponibile
            </h2>
            <p className="text-gray-600 mb-4">
              Segui alcuni artisti per vedere le loro nuove uscite!
            </p>
            <button
              onClick={() => router.push('/artists')}
              className="px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition"
            >
              Vai agli Artisti
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards - SEMPRE 3 COLONNE */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
              <div className="bg-white p-3 md:p-6 rounded-lg shadow-md border-2 border-primary-light">
                <p className="text-xs md:text-sm text-gray-600 mb-1">Totale</p>
                <p className="text-2xl md:text-4xl font-bold text-primary">{counts.total}</p>
              </div>
              <div className="bg-white p-3 md:p-6 rounded-lg shadow-md border-2 border-primary">
                <p className="text-xs md:text-sm text-gray-600 mb-1">Album</p>
                <p className="text-2xl md:text-4xl font-bold text-primary">{counts.albums}</p>
              </div>
              <div className="bg-white p-3 md:p-6 rounded-lg shadow-md border-2 border-secondary">
                <p className="text-xs md:text-sm text-gray-600 mb-1">Singoli</p>
                <p className="text-2xl md:text-4xl font-bold text-secondary">{counts.singles}</p>
              </div>
            </div>

            {/* Filters - COMPATTI MOBILE */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition bg-white text-sm"
                >
                  <option value="7">7 giorni</option>
                  <option value="30">30 giorni</option>
                  <option value="90">90 giorni</option>
                  <option value="all">Tutte</option>
                </select>
              </div>

              <div className="flex gap-2 flex-1 justify-start sm:justify-end overflow-x-auto pb-2 sm:pb-0">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap ${
                    filter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-white text-neutral-dark hover:bg-primary-light hover:bg-opacity-20 border-2 border-primary-light'
                  }`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setFilter('albums')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap ${
                    filter === 'albums'
                      ? 'bg-primary text-white'
                      : 'bg-white text-neutral-dark hover:bg-primary hover:bg-opacity-20 border-2 border-primary'
                  }`}
                >
                  Album
                </button>
                <button
                  onClick={() => setFilter('singles')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap ${
                    filter === 'singles'
                      ? 'bg-secondary text-white'
                      : 'bg-white text-neutral-dark hover:bg-secondary hover:bg-opacity-20 border-2 border-secondary'
                  }`}
                >
                  Singoli
                </button>
              </div>
            </div>

            {/* Releases Grid */}
            {filteredReleases.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <p className="text-6xl mb-4">🔍</p>
                <h2 className="text-xl font-bold text-neutral-dark mb-2">
                  Nessuna release in questo periodo
                </h2>
                <p className="text-gray-600">
                  Prova a cambiare il filtro temporale
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
                {filteredReleases.map((release) => {
                  const releaseType = release.type.toLowerCase();
                  const isAlbum = releaseType === 'album' || releaseType === 'compilation';
                  
                  return (
                    <div
                      key={release.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group cursor-pointer border-2 border-transparent hover:border-primary relative"
                      onClick={() => openRelease(release)}
                    >
                      {isNew(release.releaseDate) && (
                        <div className="absolute top-1 right-1 bg-secondary text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse">
                          NEW
                        </div>
                      )}

                      <div className="aspect-square overflow-hidden bg-gray-200">
                        <img
                          src={release.image}
                          alt={release.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      </div>

                      <div className="p-2 md:p-4">
                        <span className={`inline-block px-1.5 py-0.5 text-xs font-bold rounded mb-1 ${
                          isAlbum
                            ? 'bg-primary text-white'
                            : 'bg-secondary text-white'
                        }`}>
                          {release.type}
                        </span>

                        <h3 className="font-bold text-neutral-dark text-xs md:text-sm mb-1 line-clamp-2">
                          {release.name}
                        </h3>

                        <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                          {release.artist_name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {isNew(release.releaseDate) && '🔥 '}
                          {new Date(release.releaseDate).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>

                        {release.totalTracks && (
                          <p className="text-xs text-gray-400 mt-1">
                            {release.totalTracks} {release.totalTracks === 1 ? 'brano' : 'brani'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}