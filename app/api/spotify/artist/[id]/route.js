import { NextResponse } from 'next/server';

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  // Se token valido, usa cache
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    
    if (data.access_token) {
      cachedToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // -1 minuto di margine
      return cachedToken;
    }

    throw new Error('Failed to get Spotify token');
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    throw error;
  }
}

export async function GET(request, { params }) {
  try {
    // Unwrap params per Next.js 15
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Artist ID is required' },
        { status: 400 }
      );
    }

    console.log(`📡 Fetching artist ${id} from Spotify...`);

    // Ottieni token Spotify
    const token = await getSpotifyToken();

    // Chiamata API Spotify per dettagli artista
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ Spotify API error: ${response.status}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Artist not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Spotify API error' },
        { status: response.status }
      );
    }

    const artistData = await response.json();

    console.log(`✅ Artist fetched: ${artistData.name}`);

    // Ritorna dati artista
    return NextResponse.json({
      id: artistData.id,
      name: artistData.name,
      images: artistData.images || [],
      genres: artistData.genres || [],
      followers: artistData.followers || { total: 0 },
      popularity: artistData.popularity || 0,
      external_urls: artistData.external_urls || {},
      type: artistData.type,
      uri: artistData.uri,
    });

  } catch (error) {
    console.error('❌ Error in artist API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}