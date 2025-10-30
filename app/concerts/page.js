'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function ConcertsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState([]);
  const [filteredConcerts, setFilteredConcerts] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showOnlyFollowed, setShowOnlyFollowed] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadConcerts();
      loadFollowedArtists();
      getUserLocation();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [concerts, selectedArtist, selectedCountry, sortBy, showOnlyFollowed, userLocation, followedArtists]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }
    setUser(session.user);
  };

  const loadConcerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('concerts')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;
      setConcerts(data || []);
    } catch (error) {
      console.error('Error loading concerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowedArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('followed_artists')
        .select('artist_id, artist_name')
        .eq('user_id', user.id);

      if (error) throw error;
      setFollowedArtists(data || []);
    } catch (error) {
      console.error('Error loading followed artists:', error);
    }
  };

  const getUserLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyFilters = () => {
    let filtered = [...concerts];

    if (showOnlyFollowed && followedArtists.length > 0) {
      const followedIds = followedArtists.map(a => a.artist_id);
      filtered = filtered.filter(c => followedIds.includes(c.artist_id));
    }

    if (selectedArtist !== 'all') {
      filtered = filtered.filter(c => c.artist_id === selectedArtist);
    }

    if (selectedCountry !== 'all') {
      filtered = filtered.filter(c => c.venue_country === selectedCountry);
    }

    if (userLocation) {
      filtered = filtered.map(concert => ({
        ...concert,
        distance: concert.latitude && concert.longitude
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(concert.latitude),
              parseFloat(concert.longitude)
            )
          : null
      }));
    }

    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    } else if (sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
    }

    setFilteredConcerts(filtered);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getUniqueArtists = () => {
    const artistsMap = new Map();
    concerts.forEach(c => {
      if (!artistsMap.has(c.artist_id)) {
        artistsMap.set(c.artist_id, c.artist_name);
      }
    });
    return Array.from(artistsMap, ([id, name]) => ({ id, name }));
  };

  const getUniqueCountries = () => {
    const countries = [...new Set(concerts.map(c => c.venue_country))];
    return countries.filter(Boolean).sort();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎸 Concerti</h1>
          <p className="text-gray-400">
            {filteredConcerts.length} concerti trovati
            {userLocation && ' • Ordinati per distanza'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyFollowed}
                onChange={(e) => setShowOnlyFollowed(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm">Solo artisti seguiti</span>
            </label>

            <select
              value={selectedArtist}
              onChange={(e) => setSelectedArtist(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">Tutti gli artisti</option>
              {getUniqueArtists().map(artist => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">Tutti i paesi</option>
              {getUniqueCountries().map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm"
            >
              <option value="date">Ordina per data</option>
              <option value="distance" disabled={!userLocation}>
                Ordina per distanza {!userLocation && '(geoloc. non attiva)'}
              </option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Caricamento concerti...</p>
          </div>
        )}

        {!loading && filteredConcerts.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-xl mb-2">🎤 Nessun concerto trovato</p>
            <p className="text-gray-400 mb-4">
              {showOnlyFollowed 
                ? 'Gli artisti che segui non hanno concerti programmati'
                : 'Nessun concerto con questi filtri'}
            </p>
            {showOnlyFollowed && (
              <button
                onClick={() => setShowOnlyFollowed(false)}
                className="text-purple-400 hover:text-purple-300"
              >
                Mostra tutti i concerti
              </button>
            )}
          </div>
        )}

        {!loading && filteredConcerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConcerts.map(concert => (
              <div
                key={concert.id}
                className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
              >
                {concert.event_image && (
                  <div className="relative h-48 bg-gray-700">
                    <img
                      src={concert.event_image}
                      alt={concert.event_name}
                      className="w-full h-full object-cover"
                    />
                    {concert.distance && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                        📍 {Math.round(concert.distance)} km
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 line-clamp-2">
                    {concert.event_name}
                  </h3>
                  <p className="text-purple-400 text-sm mb-3">
                    {concert.artist_name}
                  </p>

                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatDate(concert.event_date)}</span>
                      {concert.event_time && (
                        <span className="text-gray-400">• {concert.event_time}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="line-clamp-1">
                        {concert.venue_name}, {concert.venue_city}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>🌍</span>
                      <span>{concert.venue_country}</span>
                    </div>

                    {concert.price_min && (
                      <div className="flex items-center gap-2">
                        <span>💰</span>
                        <span>
                          da {concert.price_min}
                          {concert.price_max && ` - ${concert.price_max}`}
                          {' '}{concert.currency}
                        </span>
                      </div>
                    )}
                  </div>

                  {concert.ticket_url && (
                    <a href={concert.ticket_url} target="_blank" rel="noopener noreferrer" className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center py-2 rounded-lg font-medium transition-colors">
                      🎟️ Acquista Biglietti
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}