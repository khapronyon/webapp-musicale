import { NextResponse } from 'next/server';

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // Usa token cached se ancora valido
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  return accessToken;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artist_id');

    if (!artistId) {
      return NextResponse.json({ error: 'artist_id required' }, { status: 400 });
    }

    const token = await getAccessToken();

    // Recupera albums + singles + compilations
    const albumsResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!albumsResponse.ok) {
      throw new Error('Errore Spotify API');
    }

    const albumsData = await albumsResponse.json();

    // Formatta le release
    const releases = albumsData.items
      .map(album => ({
        id: album.id,
        name: album.name,
        type: album.album_type === 'album' ? 'Album' : album.album_type === 'single' ? 'Single' : 'Compilation',
        releaseDate: album.release_date,
        image: album.images[0]?.url || null,
        spotifyUrl: album.external_urls.spotify,
        totalTracks: album.total_tracks,
      }))
      // Ordina per data (più recenti prima)
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      // Rimuovi duplicati (stesso nome)
      .filter((release, index, self) => 
        index === self.findIndex(r => r.name === release.name)
      );

    return NextResponse.json({ 
      releases,
      count: releases.length 
    });

  } catch (error) {
    console.error('Errore API artist-releases:', error);
    return NextResponse.json(
      { error: 'Errore recupero release' },
      { status: 500 }
    );
  }
}