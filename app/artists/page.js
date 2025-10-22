'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ArtistsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [loadingFollowed, setLoadingFollowed] = useState(true);

  // Carica utente e artisti seguiti
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
    loadFollowedArtists(user.id);
  }

  async function loadFollowedArtists(userId) {
    try {
      const { data, error } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', userId)
        .order('followed_at', { ascending: false });

      if (error) throw error;
      setFollowedArtists(data || []);
    } catch (error) {
      console.error('Errore caricamento artisti seguiti:', error);
    } finally {
      setLoadingFollowed(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchPerformed(true);

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

  async function handleFollow(artist) {
    if (!user) {
      router.push('/auth/login');
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

      if (error) {
        if (error.code === '23505') {
          alert('Stai già seguendo questo artista!');
        } else {
          throw error;
        }
        return;
      }

      // Ricarica artisti seguiti
      loadFollowedArtists(user.id);
      alert(`Ora segui ${artist.name}!`);
    } catch (error) {
      console.error('Errore follow artista:', error);
      alert('Errore durante il follow. Riprova.');
    }
  }

  async function handleUnfollow(artistId) {
    if (!user) return;

    if (!confirm('Vuoi smettere di seguire questo artista?')) return;

    try {
      const { error } = await supabase
        .from('followed_artists')
        .delete()
        .eq('user_id', user.id)
        .eq('artist_id', artistId);

      if (error) throw error;

      // Ricarica artisti seguiti
      loadFollowedArtists(user.id);
    } catch (error) {
      console.error('Errore unfollow artista:', error);
      alert('Errore durante l\'unfollow. Riprova.');
    }
  }

  function isFollowing(artistId) {
    return followedArtists.some(a => a.artist_id === artistId);
  }

  function formatFollowers(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">I Tuoi Artisti</h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cerca artisti su Spotify..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Cerco...' : 'Cerca'}
            </button>
          </div>
        </form>

        {/* Search Results */}
        {searchPerformed && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Risultati Ricerca ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <p className="text-gray-500">Nessun artista trovato. Prova con un altro nome.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((artist) => (
                  <div
                    key={artist.id}
                    className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                  >
                    <div className="flex items-start gap-4">
                      {/* Artist Image */}
                      <div className="w-20 h-20 flex-shrink-0">
                        {artist.image ? (
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-3xl">
                            🎤
                          </div>
                        )}
                      </div>

                      {/* Artist Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">{artist.name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatFollowers(artist.followers)} follower
                        </p>
                        {artist.genres && artist.genres.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {artist.genres.slice(0, 2).join(', ')}
                          </p>
                        )}

                        {/* Follow Button */}
                        <button
                          onClick={() => handleFollow(artist)}
                          disabled={isFollowing(artist.id)}
                          className={`mt-2 px-4 py-1 rounded-full text-sm font-medium transition ${
                            isFollowing(artist.id)
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {isFollowing(artist.id) ? '✓ Seguito' : '+ Segui'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Followed Artists */}
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Artisti Seguiti ({followedArtists.length})
          </h2>

          {loadingFollowed ? (
            <p className="text-gray-500">Caricamento...</p>
          ) : followedArtists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">🎵</p>
              <p className="text-gray-500">
                Non segui ancora nessun artista.
                <br />
                Usa la barra di ricerca per trovare i tuoi preferiti!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followedArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Artist Image */}
                    <div className="w-20 h-20 flex-shrink-0">
                      {artist.artist_image ? (
                        <img
                          src={artist.artist_image}
                          alt={artist.artist_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-3xl">
                          🎤
                        </div>
                      )}
                    </div>

                    {/* Artist Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">
                        {artist.artist_name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Seguito il {new Date(artist.followed_at).toLocaleDateString('it-IT')}
                      </p>

                      {/* Unfollow Button */}
                      <button
                        onClick={() => handleUnfollow(artist.artist_id)}
                        className="mt-2 px-4 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition"
                      >
                        Non seguire più
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}