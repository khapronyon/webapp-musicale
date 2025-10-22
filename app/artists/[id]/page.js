'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function ArtistDetailPage({ params }) {
  const router = useRouter();
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [relatedArtists, setRelatedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadArtistData();
    checkUser();
  }, [params.id]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      checkIfFollowing(user.id);
    }
  }

  async function checkIfFollowing(userId) {
    try {
      const { data } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', userId)
        .eq('artist_id', params.id)
        .single();
      
      setIsFollowing(!!data);
    } catch (error) {
      setIsFollowing(false);
    }
  }

  async function loadArtistData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/spotify/artist/${params.id}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setArtist(data.artist);
      setTopTracks(data.topTracks);
      setAlbums(data.albums);
      setRelatedArtists(data.relatedArtists);
    } catch (error) {
      console.error('Errore caricamento artista:', error);
      alert('Errore durante il caricamento. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow() {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followed_artists')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', params.id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
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
            setIsFollowing(true);
            return;
          }
          throw error;
        }
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Errore follow/unfollow:', error);
      alert('Errore durante l\'operazione. Riprova.');
    }
  }

  function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-gray-600">Caricamento...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-gray-600">Artista non trovato</p>
            <button
              onClick={() => router.push('/artists')}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Torna agli artisti
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Artist Header */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl p-8 text-white mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
          >
            ← Indietro
          </button>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Artist Image */}
            <div className="w-48 h-48 flex-shrink-0">
              {artist.image ? (
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-full h-full bg-white/20 rounded-xl flex items-center justify-center text-7xl">
                  🎤
                </div>
              )}
            </div>

            {/* Artist Info */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{artist.name}</h1>
              <p className="text-xl mb-4 opacity-90">
                {formatFollowers(artist.followers)} follower su Spotify
              </p>

              {/* Genres */}
              {artist.genres && artist.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {artist.genres.slice(0, 5).map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-white/20 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleFollow}
                  className={`px-6 py-3 rounded-lg font-medium transition ${
                    isFollowing
                      ? 'bg-white/20 hover:bg-white/30'
                      : 'bg-white text-purple-600 hover:bg-gray-100'
                  }`}
                >
                  {isFollowing ? '✓ Seguito' : '+ Segui'}
                </button>
                <a
                  href={artist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition"
                >
                  Apri su Spotify
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Top Tracks */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Brani Popolari</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {topTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b last:border-b-0"
              >
                <span className="text-gray-400 font-medium w-6">{index + 1}</span>
                <img
                  src={track.albumImage || '/placeholder.png'}
                  alt={track.album}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{track.name}</p>
                  <p className="text-sm text-gray-500 truncate">{track.album}</p>
                </div>
                <span className="text-gray-400 text-sm">{formatDuration(track.durationMs)}</span>
                {track.previewUrl && (
                  <a
                    href={track.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-purple-100 text-purple-600 rounded-lg text-sm hover:bg-purple-200 transition"
                  >
                    ▶ Preview
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Albums */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Discografia ({albums.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {albums.map((album) => (
              <a
                key={album.id}
                href={album.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition group"
              >
                <div className="aspect-square mb-3 overflow-hidden rounded-lg">
                  {album.image ? (
                    <img
                      src={album.image}
                      alt={album.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-4xl">
                      💿
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-gray-800 text-sm truncate mb-1">
                  {album.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {new Date(album.releaseDate).getFullYear()} • {album.totalTracks} brani
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* Related Artists */}
        {relatedArtists.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Artisti Correlati</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedArtists.map((relatedArtist) => (
                <div
                  key={relatedArtist.id}
                  onClick={() => router.push(`/artists/${relatedArtist.id}`)}
                  className="bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition cursor-pointer group text-center"
                >
                  <div className="aspect-square mb-2 overflow-hidden rounded-lg">
                    {relatedArtist.image ? (
                      <img
                        src={relatedArtist.image}
                        alt={relatedArtist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-3xl">
                        🎤
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 text-sm truncate">
                    {relatedArtist.name}
                  </h3>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}