'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { ArrowLeft, ExternalLink, MapPin, Calendar, ShoppingBag, Newspaper, Music } from 'lucide-react';

export default function ArtistDetailPage({ params }) {
  const router = useRouter();
  const artistId = params.id;
  
  const [user, setUser] = useState(null);
  const [artist, setArtist] = useState(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('releases');
  
  // Data per ogni sezione
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
      const response = await fetch(`/api/spotify/artist/${artistId}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setArtist(data);
    } catch (error) {
      console.error('Errore caricamento artista:', error);
      alert('Artista non trovato');
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
        const { error } = await supabase
          .from('followed_artists')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artistId);

        if (error) throw error;
        setIsFollowed(false);
      } else {
        const { error } = await supabase
          .from('followed_artists')
          .insert({
            user_id: user.id,
            artist_id: artist.id,
            artist_name: artist.name,
            artist_image: artist.images?.[0]?.url || null,
          });

        if (error) throw error;
        setIsFollowed(true);
      }
    } catch (error) {
      console.error('Errore toggle follow:', error);
      alert('Errore durante l\'operazione. Riprova.');
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
    // Simulazione - in produzione userai API NewsAPI o RSS
    const mockNews = [
      {
        id: '1',
        title: `${artist?.name} annuncia nuovo tour mondiale`,
        snippet: 'L\'artista ha rivelato le date del tour che toccherà le principali città europee...',
        image: 'https://placehold.co/600x400/667eea/ffffff?text=News',
        source: 'Rolling Stone',
        link: 'https://rollingstone.it',
        publishedAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: `Intervista esclusiva con ${artist?.name}`,
        snippet: 'Abbiamo parlato con l\'artista del nuovo album in uscita e dei progetti futuri...',
        image: 'https://placehold.co/600x400/764ba2/ffffff?text=Interview',
        source: 'Billboard',
        link: 'https://billboard.com',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    
    setNews(mockNews);
  }

  async function loadConcerts() {
    // Simulazione - in produzione userai Bandsintown/Songkick API
    const mockConcerts = [
      {
        id: '1',
        venue: 'Mediolanum Forum',
        city: 'Milano',
        country: 'Italia',
        date: '2025-12-15',
        ticketUrl: 'https://ticketone.it',
        ticketPlatform: 'TicketOne',
      },
      {
        id: '2',
        venue: 'Palapartenope',
        city: 'Napoli',
        country: 'Italia',
        date: '2025-12-20',
        ticketUrl: 'https://ticketmaster.it',
        ticketPlatform: 'TicketMaster',
      },
    ];
    
    setConcerts(mockConcerts);
  }

  async function loadMerch() {
    // Simulazione - in produzione userai Merchbar API o scraping
    const mockMerch = [
      {
        id: '1',
        title: `${artist?.name} - Tour T-Shirt`,
        price: 29.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/667eea/ffffff?text=T-Shirt',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
      },
      {
        id: '2',
        title: `${artist?.name} - Vinyl LP`,
        price: 34.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/764ba2/ffffff?text=Vinyl',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
      },
      {
        id: '3',
        title: `${artist?.name} - Hoodie`,
        price: 49.99,
        currency: 'EUR',
        image: 'https://placehold.co/400x400/f093fb/ffffff?text=Hoodie',
        storeLink: 'https://shop.example.com',
        storeName: 'Official Store',
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
      // Ignora errore se già visto (unique constraint)
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
            <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white">
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

              <div className="flex gap-3">
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
                    className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-bold transition flex items-center gap-2"
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

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-primary border-b-4 border-primary'
                      : 'text-gray-600 hover:text-primary hover:bg-primary-light hover:bg-opacity-10'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
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
                      Nessuna release recente
                    </h2>
                    <p className="text-gray-600">
                      Le prossime uscite appariranno qui
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {releases.map((release) => (
                      <div
                        key={release.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group cursor-pointer"
                        onClick={() => openRelease(release)}
                      >
                        <div className="aspect-square overflow-hidden bg-gray-200">
                          <img
                            src={release.image}
                            alt={release.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-neutral-dark mb-1 line-clamp-2">
                            {release.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {release.releaseDate}
                          </p>
                          <span className="inline-block px-2 py-1 bg-primary-light bg-opacity-20 text-primary text-xs font-medium rounded">
                            {release.type}
                          </span>
                        </div>
                      </div>
                    ))}
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
                        href={article.link}
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
                            />
                          </div>
                          <div className="flex-1 p-6">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                              <span className="font-medium text-primary">{article.source}</span>
                              <span>•</span>
                              <span>{new Date(article.publishedAt).toLocaleDateString('it-IT')}</span>
                            </div>
                            <h3 className="text-xl font-bold text-neutral-dark mb-2 line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-gray-600 line-clamp-3">
                              {article.snippet}
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-primary font-medium">
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
                          <a
                            href={concert.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-secondary hover:bg-secondary-light text-white rounded-lg font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            Acquista su {concert.ticketPlatform}
                            <ExternalLink size={18} />
                          </a>
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