'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { ArrowLeft, ExternalLink, MapPin, Calendar, ShoppingBag, Newspaper, Music } from 'lucide-react';

export default function ArtistDetailPage({ params }) {
  const router = useRouter();
  const { id: artistId } = React.use(params);
  
  const [user, setUser] = useState(null);
  const [artist, setArtist] = useState(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('releases');
  
  const [releases, setReleases] = useState([]);
  const [news, setNews] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [merch, setMerch] = useState([]);
  
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && artistId) {
      loadArtistData();
      checkIfFollowed();
    }
  }, [user, artistId]);

  useEffect(() => {
    if (artist) {
      loadTabData(activeTab);
    }
  }, [activeTab, artist]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
  }

  async function loadArtistData() {
    try {
      console.log(`📡 Loading artist ${artistId}...`);
      
      const response = await fetch(`/api/spotify/artist/${artistId}`);
      const data = await response.json();
      
      console.log('📥 Artist data received:', data);
      
      if (data.error) {
        console.error('❌ API Error:', data.error);
        throw new Error(data.error);
      }
      
      if (!data.id || !data.name) {
        console.error('❌ Invalid artist data:', data);
        throw new Error('Dati artista non validi');
      }
      
      console.log('✅ Artist loaded:', {
        id: data.id,
        name: data.name,
        images: data.images?.length || 0,
        followers: data.followers?.total || 0
      });
      
      setArtist(data);
    } catch (error) {
      console.error('❌ Errore caricamento artista:', error);
      alert('Artista non trovato o errore di caricamento');
      router.push('/artists');
    } finally {
      setLoading(false);
    }
  }

  async function checkIfFollowed() {
    try {
      const { data } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id)
        .eq('artist_id', artistId)
        .single();
      
      setIsFollowed(!!data);
    } catch (error) {
      setIsFollowed(false);
    }
  }

  async function toggleFollow() {
    if (!user || !artist) return;

    try {
      if (isFollowed) {
        // Unfollow
        const { error } = await supabase
          .from('followed_artists')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artistId);

        if (error) throw error;
        setIsFollowed(false);
        console.log('✅ Unfollowed successfully');
      } else {
        // Follow - con dati sicuri
        const artistData = {
          user_id: user.id,
          artist_id: artistId,
          artist_name: artist.name || 'Unknown Artist',
          artist_image: artist.images?.[0]?.url || null,
        };

        console.log('📤 Inserting follow:', artistData);

        const { data, error } = await supabase
          .from('followed_artists')
          .insert(artistData)
          .select();

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }

        console.log('✅ Followed successfully:', data);
        setIsFollowed(true);
      }
    } catch (error) {
      console.error('❌ Errore toggle follow:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert(`Errore durante l'operazione: ${error.message || 'Riprova'}`);
    }
  }

  async function loadTabData(tab) {
    setLoadingData(true);
    
    try {
      switch (tab) {
        case 'releases':
          await loadReleases();
          break;
        case 'news':
          await loadNews();
          break;
        case 'concerts':
          await loadConcerts();
          break;
        case 'merch':
          await loadMerch();
          break;
      }
    } catch (error) {
      console.error(`Errore caricamento ${tab}:`, error);
    } finally {
      setLoadingData(false);
    }
  }

  async function loadReleases() {
    try {
      const response = await fetch(`/api/spotify/artist-releases?artist_id=${artistId}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setReleases(data.releases || []);
    } catch (error) {
      console.error('Errore caricamento release:', error);
      setReleases([]);
    }
  }

  async function loadNews() {
    try {
      const response = await fetch(`/api/artist-news?artist=${encodeURIComponent(artist.name)}&pageSize=20`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Error loading artist news:', data.error);
        setNews([]);
        return;
      }
      
      console.log(`✅ Loaded ${data.articles.length} news for ${artist.name}`);
      setNews(data.articles || []);
    } catch (error) {
      console.error('Errore caricamento news:', error);
      setNews([]);
    }
  }

  async function loadConcerts() {
    // Mock data - in produzione useresti Bandsintown/Songkick API
    const mockConcerts = [
      {
        id: '1',
        venue: 'Mediolanum Forum',
        city: 'Milano',
        country: 'Italia',
        date: '2026-03-15',
        ticketUrl: 'https://ticketone.it',
        ticketPlatform: 'TicketOne',
        soldOut: false,
      },
      {
        id: '2',
        venue: 'Palapartenope',
        city: 'Napoli',
        country: 'Italia',
        date: '2026-03-20',
        ticketUrl: 'https://ticketmaster.it',
        ticketPlatform: 'TicketMaster',
        soldOut: false,
      },
      {
        id: '3',
        venue: 'Unipol Arena',
        city: 'Bologna',
        country: 'Italia',
        date: '2026-03-25',
        ticketUrl: 'https://ticketone.it',
        ticketPlatform: 'TicketOne',
        soldOut: true,
      },
    ];
    
    setConcerts(mockConcerts);
  }

  async function loadMerch() {
    // Mock data - in produzione useresti Merchbar API
    const mockMerch = [
      {
        id: '1',
        title: `${artist?.name} - Tour 2026 T-Shirt`,
        price: 29.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/667eea/ffffff?text=T-Shirt',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
        category: 'Abbigliamento',
      },
      {
        id: '2',
        title: `${artist?.name} - Latest Album Vinyl`,
        price: 34.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/764ba2/ffffff?text=Vinyl',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
        category: 'Musica',
      },
      {
        id: '3',
        title: `${artist?.name} - Limited Edition Hoodie`,
        price: 49.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/f093fb/ffffff?text=Hoodie',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
        category: 'Abbigliamento',
      },
      {
        id: '4',
        title: `${artist?.name} - Poster Set`,
        price: 19.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/4facfe/ffffff?text=Poster',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
        category: 'Accessori',
      },
    ];
    
    setMerch(mockMerch);
  }

  async function markReleaseAsViewed(releaseId) {
    if (!user) return;

    try {
      await supabase
        .from('viewed_releases')
        .insert({
          user_id: user.id,
          release_id: releaseId,
          artist_id: artistId,
        });
    } catch (error) {
      // Ignora se già visto
    }
  }

  function openRelease(release) {
    markReleaseAsViewed(release.id);
    window.open(release.spotifyUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <p className="text-gray-600">Caricamento artista...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600">Artista non trovato</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'releases', label: 'Release', icon: Music, count: releases.length },
    { id: 'news', label: 'News', icon: Newspaper, count: news.length },
    { id: 'concerts', label: 'Concerti', icon: Calendar, count: concerts.length },
    { id: 'merch', label: 'Merch', icon: ShoppingBag, count: merch.length },
  ];

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary via-primary-dark to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Back Button */}
          <button
            onClick={() => router.push('/artists')}
            className="flex items-center gap-2 mb-6 hover:opacity-80 transition"
          >
            <ArrowLeft size={20} />
            <span>Torna agli artisti</span>
          </button>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Artist Image */}
            <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white flex-shrink-0">
              {artist.images?.[0]?.url ? (
                <img
                  src={artist.images[0].url}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary-light flex items-center justify-center text-6xl">
                  🎤
                </div>
              )}
            </div>

            {/* Artist Info */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{artist.name}</h1>
              {artist.genres && artist.genres.length > 0 && (
                <p className="text-lg opacity-90 mb-4">
                  {artist.genres.slice(0, 3).join(' • ')}
                </p>
              )}
              {artist.followers && (
                <p className="text-sm opacity-75 mb-4">
                  {artist.followers.total.toLocaleString()} followers su Spotify
                </p>
              )}

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={toggleFollow}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    isFollowed
                      ? 'bg-white text-primary hover:bg-gray-100'
                      : 'bg-secondary hover:bg-secondary-light text-white'
                  }`}
                >
                  {isFollowed ? '✓ Seguito' : '+ Segui'}
                </button>
                
                {artist.external_urls?.spotify && (
                  <a
                    href={artist.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-neutral-dark hover:bg-black text-white rounded-lg font-bold transition flex items-center gap-2"
                  >
                    Apri su Spotify
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - TUTTI VISIBILI MOBILE */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-2">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 font-medium transition ${
                    activeTab === tab.id
                      ? 'text-white bg-primary border-b-4 border-primary-dark'
                      : 'text-gray-600 hover:text-primary hover:bg-primary-light hover:bg-opacity-10'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white text-primary'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loadingData ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🎵</div>
            <p className="text-gray-600">Caricamento...</p>
          </div>
        ) : (
          <>
            {/* RELEASES TAB */}
            {activeTab === 'releases' && (
              <div>
                {releases.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-6xl mb-4">🎵</p>
                    <h2 className="text-xl font-bold text-neutral-dark mb-2">
                      Nessuna release disponibile
                    </h2>
                    <p className="text-gray-600">
                      Le prossime uscite appariranno qui
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
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
                          {(() => {
                            const daysSinceRelease = Math.floor(
                              (Date.now() - new Date(release.releaseDate)) / (1000 * 60 * 60 * 24)
                            );
                            return daysSinceRelease <= 7 ? (
                              <div className="absolute top-1 right-1 bg-secondary text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse">
                                NEW
                              </div>
                            ) : null;
                          })()}

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
                            
                            <p className="text-xs text-gray-600 mb-1">
                              {new Date(release.releaseDate).toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            
                            {release.totalTracks && (
                              <p className="text-xs text-gray-500">
                                {release.totalTracks} {release.totalTracks === 1 ? 'brano' : 'brani'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* NEWS TAB */}
            {activeTab === 'news' && (
              <div>
                {news.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-6xl mb-4">📰</p>
                    <h2 className="text-xl font-bold text-neutral-dark mb-2">
                      Nessuna news disponibile
                    </h2>
                    <p className="text-gray-600">
                      Le news su {artist.name} appariranno qui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {news.map((article) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition"
                      >
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-1/3 aspect-video md:aspect-square overflow-hidden bg-gray-200">
                            <img
                              src={article.image}
                              alt={article.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/800x450/667eea/ffffff?text=News';
                              }}
                            />
                          </div>
                          <div className="flex-1 p-4 md:p-6">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                              <span className="font-medium text-primary">{article.source}</span>
                              <span>•</span>
                              <span>{new Date(article.publishedAt).toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-neutral-dark mb-2 line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-gray-600 text-sm md:text-base mb-3 line-clamp-3">
                              {article.description}
                            </p>
                            {article.author && (
                              <p className="text-xs text-gray-500 mb-3">
                                {article.author}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-primary font-medium text-sm">
                              Leggi articolo
                              <ExternalLink size={16} />
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONCERTS TAB */}
            {activeTab === 'concerts' && (
              <div>
                {concerts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-6xl mb-4">🎤</p>
                    <h2 className="text-xl font-bold text-neutral-dark mb-2">
                      Nessun concerto in programma
                    </h2>
                    <p className="text-gray-600">
                      I prossimi concerti di {artist.name} appariranno qui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {concerts.map((concert) => (
                      <div
                        key={concert.id}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-neutral-dark mb-2">
                              {concert.venue}
                            </h3>
                            <div className="flex flex-col gap-2 text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-primary" />
                                <span>{concert.city}, {concert.country}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-primary" />
                                <span>{new Date(concert.date).toLocaleDateString('it-IT', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                              </div>
                            </div>
                          </div>
                          {concert.soldOut ? (
                            <div className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold text-center">
                              Sold Out
                            </div>
                          ) : (
                            <a
                              href={concert.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-3 bg-secondary hover:bg-secondary-light text-white rounded-lg font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                              Acquista su {concert.ticketPlatform}
                              <ExternalLink size={18} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MERCH TAB */}
            {activeTab === 'merch' && (
              <div>
                {merch.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-6xl mb-4">🛍️</p>
                    <h2 className="text-xl font-bold text-neutral-dark mb-2">
                      Nessun merchandising disponibile
                    </h2>
                    <p className="text-gray-600">
                      Il merchandising di {artist.name} apparirà qui
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {merch.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition"
                      >
                        <div className="aspect-square overflow-hidden bg-gray-200">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <span className="inline-block px-2 py-1 bg-primary-light bg-opacity-20 text-primary text-xs font-medium rounded mb-2">
                            {item.category}
                          </span>
                          <h3 className="font-bold text-neutral-dark mb-2 line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-lg font-bold text-primary mb-3">
                            €{item.price.toFixed(2)}
                          </p>
                          <a
                            href={item.storeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 bg-secondary hover:bg-secondary-light text-white rounded-lg font-medium transition text-center"
                          >
                            Vedi su {item.storeName}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}