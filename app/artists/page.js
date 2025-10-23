'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UnfollowModal from '../components/UnfollowModal';
import { Search, ArrowUpDown, Filter } from 'lucide-react';

export default function ArtistsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [artistsWithNotifications, setArtistsWithNotifications] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showFollowed, setShowFollowed] = useState(true);
  
  // Filtri e ordinamento
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  
  // Modal unfollow
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [artistToUnfollow, setArtistToUnfollow] = useState(null);

  // Protezione loop con useRef
  const hasCheckedReleases = useRef(false);

  useEffect(() => {
    checkUser();
  }, []);

  // Controlla release SOLO UNA VOLTA quando artisti sono caricati
  useEffect(() => {
    if (user && followedArtists.length > 0 && !hasCheckedReleases.current) {
      hasCheckedReleases.current = true;
      checkNewReleases();
    }
  }, [user, followedArtists]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
    loadFollowedArtists(user);
  }

  async function loadFollowedArtists(user) {
    try {
      const { data, error } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setFollowedArtists(data || []);
    } catch (error) {
      console.error('Errore caricamento artisti seguiti:', error);
    }
  }

  async function checkNewReleases() {
    console.log('🔍 Inizio controllo release...');
    
    try {
      const artistsWithUpdates = new Set();

      // Limita a massimo 10 artisti per evitare troppe chiamate
      const artistsToCheck = followedArtists.slice(0, 10);
      console.log(`📊 Controllo ${artistsToCheck.length} artisti`);

      for (const artist of artistsToCheck) {
        try {
          console.log(`🎤 Checking ${artist.artist_name}...`);
          
          const response = await fetch(`/api/spotify/artist-releases?artist_id=${artist.artist_id}`);
          
          if (!response.ok) {
            console.warn(`⚠️ API fallita per ${artist.artist_name}`);
            continue;
          }
          
          const data = await response.json();

          if (data.releases && data.releases.length > 0) {
            // Controlla release ultimi 30 giorni
            const recentReleases = data.releases.filter(release => {
              const releaseDate = new Date(release.releaseDate);
              const daysSinceRelease = Math.floor((Date.now() - releaseDate) / (1000 * 60 * 60 * 24));
              return daysSinceRelease <= 30;
            });

            if (recentReleases.length > 0) {
              // Controlla se viste
              const { data: viewedReleases } = await supabase
                .from('viewed_releases')
                .select('release_id')
                .eq('user_id', user.id)
                .eq('artist_id', artist.artist_id)
                .in('release_id', recentReleases.map(r => r.id));

              const viewedIds = new Set(viewedReleases?.map(v => v.release_id) || []);
              const hasUnseenReleases = recentReleases.some(r => !viewedIds.has(r.id));

              if (hasUnseenReleases) {
                artistsWithUpdates.add(artist.artist_id);
                console.log(`✨ ${artist.artist_name} ha novità!`);
              }
            }
          }

          // Delay tra chiamate per evitare rate limit
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Errore check ${artist.artist_name}:`, error);
          continue;
        }
      }

      console.log(`✅ Controllo completato. ${artistsWithUpdates.size} artisti con novità`);
      setArtistsWithNotifications(artistsWithUpdates);

    } catch (error) {
      console.error('❌ Errore generale controllo release:', error);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setShowFollowed(false);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSearchResults(data.artists || []);
    } catch (error) {
      console.error('Errore ricerca:', error);
      alert('Errore durante la ricerca. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  function initiateUnfollow(artist) {
    setArtistToUnfollow(artist);
    setShowUnfollowModal(true);
  }

  async function confirmUnfollow() {
    if (!user || !artistToUnfollow) return;

    try {
      const { error } = await supabase
        .from('followed_artists')
        .delete()
        .eq('user_id', user.id)
        .eq('artist_id', artistToUnfollow.artist_id);

      if (error) throw error;

      setFollowedArtists(prev => prev.filter(a => a.artist_id !== artistToUnfollow.artist_id));
      setArtistsWithNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(artistToUnfollow.artist_id);
        return newSet;
      });
      setShowUnfollowModal(false);
      setArtistToUnfollow(null);
    } catch (error) {
      console.error('Errore unfollow:', error);
      alert('Errore durante l\'operazione. Riprova.');
    }
  }

  async function toggleFollow(artist) {
    if (!user) return;

    const isFollowed = followedArtists.some(a => a.artist_id === artist.id);

    if (isFollowed) {
      initiateUnfollow({ artist_id: artist.id, artist_name: artist.name });
      return;
    }

    try {
      const { error } = await supabase
        .from('followed_artists')
        .insert({
          user_id: user.id,
          artist_id: artist.id,
          artist_name: artist.name,
          artist_image: artist.image,
        });

      if (error) throw error;

      const newArtist = {
        artist_id: artist.id,
        artist_name: artist.name,
        artist_image: artist.image,
      };
      
      setFollowedArtists(prev => [...prev, newArtist]);
      
      // Reset flag per permettere nuovo check
      hasCheckedReleases.current = false;

    } catch (error) {
      console.error('Errore follow:', error);
      alert('Errore durante l\'operazione. Riprova.');
    }
  }

  function isFollowed(artistId) {
    return followedArtists.some(a => a.artist_id === artistId);
  }

  function hasUpdates(artistId) {
    return artistsWithNotifications.has(artistId);
  }

  function getSortedAndFilteredArtists() {
    let artists = [...followedArtists];

    // Applica filtro
    if (filterBy === 'with-updates') {
      artists = artists.filter(a => hasUpdates(a.artist_id));
    }

    // Applica ordinamento
    artists.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.artist_name.localeCompare(b.artist_name);
        case 'date':
          return followedArtists.indexOf(b) - followedArtists.indexOf(a);
        case 'updates':
          const aHasUpdates = hasUpdates(a.artist_id) ? 1 : 0;
          const bHasUpdates = hasUpdates(b.artist_id) ? 1 : 0;
          return bHasUpdates - aHasUpdates;
        default:
          return 0;
      }
    });

    return artists;
  }

  const displayedArtists = getSortedAndFilteredArtists();

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">Artisti</h1>
        <p className="text-gray-600 mb-8">Cerca e segui i tuoi artisti preferiti</p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca artisti su Spotify..."
                className="w-full pl-10 pr-4 py-3 border-2 border-primary-light rounded-lg focus:outline-none focus:border-primary transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Ricerca...' : 'Cerca'}
            </button>
          </div>
        </form>

        {/* Toggle View */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowFollowed(true)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              showFollowed
                ? 'bg-primary text-white'
                : 'bg-white text-neutral-dark hover:bg-primary-light hover:bg-opacity-20 border-2 border-primary-light'
            }`}
          >
            Seguiti ({followedArtists.length})
            {artistsWithNotifications.size > 0 && (
              <span className="ml-2 bg-secondary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {artistsWithNotifications.size}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowFollowed(false)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              !showFollowed
                ? 'bg-secondary text-white'
                : 'bg-white text-neutral-dark hover:bg-secondary hover:bg-opacity-20 border-2 border-secondary'
            }`}
          >
            Risultati Ricerca ({searchResults.length})
          </button>
        </div>

        {/* Filtri e Ordinamento */}
        {showFollowed && followedArtists.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ArrowUpDown size={18} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition bg-white"
              >
                <option value="name">Ordina: A-Z</option>
                <option value="date">Ordina: Seguiti di recente</option>
                <option value="updates">Ordina: Con novità</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition bg-white"
              >
                <option value="all">Mostra: Tutti</option>
                <option value="with-updates">Mostra: Solo con novità</option>
              </select>
            </div>
          </div>
        )}

        {/* Followed Artists */}
        {showFollowed && (
          <div>
            {followedArtists.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border-2 border-primary-light">
                <p className="text-6xl mb-4">🎤</p>
                <h2 className="text-xl font-bold text-neutral-dark mb-2">
                  Non segui ancora nessun artista
                </h2>
                <p className="text-gray-600">
                  Cerca i tuoi artisti preferiti e inizia a seguirli!
                </p>
              </div>
            ) : displayedArtists.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border-2 border-primary-light">
                <p className="text-6xl mb-4">🔍</p>
                <h2 className="text-xl font-bold text-neutral-dark mb-2">
                  Nessun artista con questi filtri
                </h2>
                <p className="text-gray-600">
                  Prova a cambiare i filtri di ricerca
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayedArtists.map((artist) => (
                  <div
                    key={artist.artist_id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group border-2 border-transparent hover:border-primary relative"
                  >
                    {/* Badge Novità */}
                    {hasUpdates(artist.artist_id) && (
                      <div className="absolute top-2 right-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded-full z-10 animate-pulse">
                        ! Novità
                      </div>
                    )}

                    <button
                      onClick={() => router.push(`/artists/${artist.artist_id}`)}
                      className="w-full"
                    >
                      <div className="aspect-square overflow-hidden bg-gray-200">
                        {artist.artist_image ? (
                          <img
                            src={artist.artist_image}
                            alt={artist.artist_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            🎤
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-neutral-dark text-center line-clamp-2">
                          {artist.artist_name}
                        </h3>
                      </div>
                    </button>

                    <div className="px-4 pb-4">
                      <button
                        onClick={() => initiateUnfollow(artist)}
                        className="w-full py-2 bg-primary-dark text-white rounded-lg font-medium hover:bg-red-500 transition"
                      >
                        Seguito ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {!showFollowed && (
          <div>
            {loading && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 animate-bounce">🎵</div>
                <p className="text-gray-600">Ricerca in corso...</p>
              </div>
            )}

            {!loading && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <p className="text-6xl mb-4">🔍</p>
                <p className="text-gray-500">Nessun risultato trovato per &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map((artist) => (
                  <div
                    key={artist.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group border-2 border-transparent hover:border-primary"
                  >
                    <button
                      onClick={() => router.push(`/artists/${artist.id}`)}
                      className="w-full"
                    >
                      <div className="aspect-square overflow-hidden bg-gray-200 relative">
                        {artist.image ? (
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            🎤
                          </div>
                        )}
                        {isFollowed(artist.id) && (
                          <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="p-4">
                      <h3 className="font-bold text-neutral-dark text-center mb-2 line-clamp-2">
                        {artist.name}
                      </h3>
                      {artist.genres && artist.genres.length > 0 && (
                        <p className="text-xs text-gray-500 text-center mb-3 line-clamp-1">
                          {artist.genres.slice(0, 2).join(', ')}
                        </p>
                      )}
                      <button
                        onClick={() => toggleFollow(artist)}
                        className={`w-full py-2 rounded-lg font-medium transition ${
                          isFollowed(artist.id)
                            ? 'bg-primary-dark text-white hover:bg-primary'
                            : 'bg-secondary text-white hover:bg-secondary-light'
                        }`}
                      >
                        {isFollowed(artist.id) ? 'Seguito ✓' : 'Segui'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {showUnfollowModal && (
        <UnfollowModal
          artist={artistToUnfollow}
          onConfirm={confirmUnfollow}
          onCancel={() => {
            setShowUnfollowModal(false);
            setArtistToUnfollow(null);
          }}
        />
      )}
    </div>
  );
}