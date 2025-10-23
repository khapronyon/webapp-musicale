'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ExternalLink, Play } from 'lucide-react';

export default function ArtistDetailPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const artistId = unwrappedParams.id;
  
  const [user, setUser] = useState(null);
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);

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
    loadArtistData(user, artistId);
  }

  async function loadArtistData(user, artistId) {
    setLoading(true);
    try {
      const response = await fetch(`/api/spotify/artist/${artistId}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // L'API ritorna { artist, topTracks, albums, relatedArtists }
      // data.artist ha già i dati formattati dalla nostra API
      const artistData = {
        id: artistId,
        name: data.artist?.name,
        image: data.artist?.image, // ← Direttamente da artist.image
        followers: data.artist?.followers || 0,
        genres: data.artist?.genres || [],
        spotifyUrl: data.artist?.spotifyUrl,
        topTracks: data.topTracks || [],
        albums: data.albums || [],
        relatedArtists: data.relatedArtists || [],
      };

      console.log('✅ Dati artista caricati:', artistData.name);
      console.log('✅ URL immagine:', artistData.image);

      setArtist(artistData);

      const { data: followData } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id)
        .eq('artist_id', artistId)
        .single();

      setIsFollowed(!!followData);
    } catch (error) {
      console.error('❌ Errore caricamento artista:', error);
      alert('Errore durante il caricamento. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFollow() {
    if (!user || !artist) return;

    try {
      if (isFollowed) {
        const { error } = await supabase
          .from('followed_artists')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artist.id);

        if (error) throw error;

        setIsFollowed(false);
        alert(`Non segui più ${artist.name}`);
      } else {
        const { error } = await supabase
          .from('followed_artists')
          .insert({
            user_id: user.id,
            artist_id: artist.id,
            artist_name: artist.name,
            artist_image: artist.image || null,
          });

        if (error) throw error;

        setIsFollowed(true);
        alert(`Ora segui ${artist.name}! 🎵`);
      }
    } catch (error) {
      console.error('Errore follow/unfollow:', error);
      alert('Errore durante l\'operazione. Riprova.');
    }
  }

  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  }

  function getTypeColor(type) {
    const colors = {
      'album': 'bg-primary text-white border-2 border-primary-dark',
      'single': 'bg-secondary text-white border-2 border-secondary',
      'compilation': 'bg-primary-dark text-white border-2 border-primary'
    };
    return colors[type] || 'bg-gray-500 text-white border-2 border-gray-700';
  }

  function getTypeLabel(type) {
    const labels = {
      'album': 'Album',
      'single': 'Singolo',
      'compilation': 'Compilation'
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light">
        <Header />
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-neutral-light">
        <Header />
        <div className="text-center py-20">
          <p className="text-6xl mb-4">❌</p>
          <p className="text-gray-600">Artista non trovato</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light">
      <Header />

      {/* Artist Header */}
      <div 
        className="relative h-80 bg-gradient-to-b from-primary via-primary-light to-transparent"
      >
        {/* Background Image con Overlay */}
        {artist.image && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${artist.image})`,
              filter: 'brightness(0.4)',
            }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary-light/70 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            {artist.image && (
              <img
                src={artist.image}
                alt={artist.name}
                className="w-48 h-48 rounded-lg shadow-2xl border-4 border-white object-cover relative z-10"
              />
            )}
            <div className="flex-1 pb-4 relative z-10">
              <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">{artist.name}</h1>
              <div className="flex items-center gap-4 text-white drop-shadow-lg">
                <span className="text-lg font-medium">{formatNumber(artist.followers)} follower</span>
                {artist.genres && artist.genres.length > 0 && (
                  <span className="text-lg">• {artist.genres.slice(0, 3).join(', ')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={toggleFollow}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              isFollowed
                ? 'bg-primary-dark text-white hover:bg-primary'
                : 'bg-secondary text-white hover:bg-secondary-light'
            }`}
          >
            {isFollowed ? 'Seguito ✓' : 'Segui'}
          </button>
          <a
            href={artist.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition flex items-center gap-2"
          >
            Apri su Spotify <ExternalLink size={20} />
          </a>
        </div>

        {/* Top Tracks */}
        {artist.topTracks && artist.topTracks.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-dark mb-4">Brani Popolari</h2>
            <div className="bg-white rounded-lg shadow-md border-2 border-primary-light overflow-hidden">
              {artist.topTracks.map((track, index) => (
                <a
                  key={track.id}
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 hover:bg-neutral-light transition border-b last:border-b-0 group"
                >
                  <span className="text-gray-400 font-bold w-6">{index + 1}</span>
                  {track.image && (
                    <img
                      src={track.image}
                      alt={track.name}
                      className="w-14 h-14 rounded shadow-md"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-neutral-dark group-hover:text-primary transition">{track.name}</p>
                    <p className="text-sm text-gray-500">{track.album}</p>
                  </div>
                  <Play className="text-secondary opacity-0 group-hover:opacity-100 transition" size={24} />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Discography */}
        {artist.albums && artist.albums.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-dark mb-4">Discografia</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {artist.albums.map((album) => (
                <a
                  key={album.id}
                  href={album.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group border-2 border-transparent hover:border-primary"
                >
                  <div className="aspect-square overflow-hidden bg-gray-200">
                    {album.image ? (
                      <img
                        src={album.image}
                        alt={album.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        💿
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getTypeColor(album.type)}`}>
                      {getTypeLabel(album.type)}
                    </span>
                    <h3 className="font-bold text-neutral-dark text-sm mb-1 line-clamp-2">
                      {album.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(album.releaseDate).getFullYear()}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related Artists */}
        {artist.relatedArtists && artist.relatedArtists.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-neutral-dark mb-4">Artisti Simili</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {artist.relatedArtists.map((relArtist) => (
                <button
                  key={relArtist.id}
                  onClick={() => router.push(`/artists/${relArtist.id}`)}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group border-2 border-transparent hover:border-secondary"
                >
                  <div className="aspect-square overflow-hidden bg-gray-200">
                    {relArtist.image ? (
                      <img
                        src={relArtist.image}
                        alt={relArtist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🎤
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-neutral-dark text-sm text-center line-clamp-2">
                      {relArtist.name}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}