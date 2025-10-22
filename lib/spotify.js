// lib/spotify.js
// Helper per interagire con Spotify API

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Token cache per evitare richieste continue
let cachedToken = null;
let tokenExpirationTime = 0;

/**
 * Ottiene un access token da Spotify usando Client Credentials Flow
 * Il token viene cachato per 1 ora (3600 secondi)
 */
async function getAccessToken() {
  // Se abbiamo un token valido in cache, usalo
  if (cachedToken && Date.now() < tokenExpirationTime) {
    return cachedToken;
  }

  // Altrimenti richiedi un nuovo token
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  
  // Salva in cache
  cachedToken = data.access_token;
  tokenExpirationTime = Date.now() + (data.expires_in * 1000); // expires_in è in secondi
  
  return cachedToken;
}

/**
 * Cerca artisti su Spotify
 * @param {string} query - Nome artista da cercare
 * @param {number} limit - Numero massimo di risultati (default 20)
 * @returns {Promise<Array>} Array di artisti con: id, name, images, genres, popularity
 */
export async function searchArtists(query, limit = 20) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    
    // Restituisci solo i dati essenziali degli artisti
    return data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images[0]?.url || null, // Immagine più grande, o null se non disponibile
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      spotifyUrl: artist.external_urls.spotify,
    }));
  } catch (error) {
    console.error('Errore ricerca artisti Spotify:', error);
    throw error;
  }
}

/**
 * Ottiene i dettagli completi di un artista
 * @param {string} artistId - ID Spotify dell'artista
 * @returns {Promise<Object>} Dati completi artista
 */
export async function getArtistDetails(artistId) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const artist = await response.json();
    
    return {
      id: artist.id,
      name: artist.name,
      image: artist.images[0]?.url || null,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      spotifyUrl: artist.external_urls.spotify,
    };
  } catch (error) {
    console.error('Errore dettagli artista Spotify:', error);
    throw error;
  }
}

/**
 * Ottiene i top tracks di un artista
 * @param {string} artistId - ID Spotify dell'artista
 * @param {string} market - Codice paese (default 'IT')
 * @returns {Promise<Array>} Array di tracce
 */
export async function getArtistTopTracks(artistId, market = 'IT') {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    
    return data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      album: track.album.name,
      albumImage: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
      durationMs: track.duration_ms,
    }));
  } catch (error) {
    console.error('Errore top tracks artista Spotify:', error);
    throw error;
  }
}

/**
 * Ottiene gli album di un artista
 * @param {string} artistId - ID Spotify dell'artista
 * @param {number} limit - Numero massimo di album (default 20)
 * @returns {Promise<Array>} Array di album
 */
export async function getArtistAlbums(artistId, limit = 20) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}&include_groups=album,single`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    
    return data.items.map(album => ({
      id: album.id,
      name: album.name,
      image: album.images[0]?.url || null,
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      type: album.album_type,
      spotifyUrl: album.external_urls.spotify,
    }));
  } catch (error) {
    console.error('Errore album artista Spotify:', error);
    throw error;
  }
}

/**
 * Ottiene artisti correlati/simili
 * @param {string} artistId - ID Spotify dell'artista
 * @returns {Promise<Array>} Array di artisti correlati
 */
export async function getRelatedArtists(artistId) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    
    // Gestione errori API o dati mancanti
    if (!data.artists || !Array.isArray(data.artists)) {
      console.warn('Nessun artista correlato trovato per:', artistId);
      return [];
    }
    
    return data.artists.slice(0, 6).map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images[0]?.url || null,
      genres: artist.genres,
      popularity: artist.popularity,
      spotifyUrl: artist.external_urls.spotify,
    }));
  } catch (error) {
    console.error('Errore artisti correlati Spotify:', error);
    return []; // Ritorna array vuoto invece di lanciare errore
  }
}

/**
 * Ottiene le nuove release musicali
 * @param {string} country - Codice paese (default 'IT')
 * @param {number} limit - Numero massimo di release (default 50)
 * @returns {Promise<Array>} Array di album/singoli
 */
export async function getNewReleases(country = 'IT', limit = 50) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?country=${country}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    
    if (!data.albums || !data.albums.items) {
      return [];
    }
    
    return data.albums.items.map(album => ({
      id: album.id,
      name: album.name,
      image: album.images[0]?.url || null,
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      type: album.album_type, // 'album', 'single', 'compilation'
      artists: album.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
      })),
      spotifyUrl: album.external_urls.spotify,
    }));
  } catch (error) {
    console.error('Errore nuove release Spotify:', error);
    return [];
  }
}

/**
 * Ottiene le release recenti di un artista (ultimi 24 mesi)
 * @param {string} artistId - ID Spotify dell'artista
 * @param {number} limit - Numero massimo di release (default 10)
 * @returns {Promise<Array>} Array di album/singoli recenti
 */
export async function getArtistRecentReleases(artistId, limit = 10) {
  try {
    const token = await getAccessToken();
    
    // Chiamata separata per ALBUM
    const albumsResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}&include_groups=album`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    // Chiamata separata per SINGOLI
    const singlesResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}&include_groups=single`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const albumsData = await albumsResponse.json();
    const singlesData = await singlesResponse.json();
    
    console.log(`[${artistId}] Album trovati:`, albumsData.items?.length || 0);
    console.log(`[${artistId}] Singoli trovati:`, singlesData.items?.length || 0);

    const allItems = [
      ...(albumsData.items || []),
      ...(singlesData.items || [])
    ];

    if (allItems.length === 0) {
      return [];
    }

    // Filtra solo release degli ultimi 24 mesi (2 anni)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const filtered = allItems
      .filter(album => {
        const releaseDate = new Date(album.release_date);
        return releaseDate >= twoYearsAgo;
      })
      .map(album => ({
        id: album.id,
        name: album.name,
        image: album.images[0]?.url || null,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        type: album.album_type,
        artistId: artistId,
        spotifyUrl: album.external_urls.spotify,
      }));

    console.log(`[${artistId}] Release dopo filtro (ultimi 2 anni):`, filtered.length);
    
    return filtered;
  } catch (error) {
    console.error(`Errore release recenti artista ${artistId}:`, error);
    return [];
  }
}