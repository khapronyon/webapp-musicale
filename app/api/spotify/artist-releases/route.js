// app/api/spotify/artist-releases/route.js
// API Route per ottenere le release recenti di un singolo artista

import { getArtistRecentReleases } from '@/lib/spotify';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artist_id');

    if (!artistId) {
      return NextResponse.json(
        { error: 'artist_id mancante' },
        { status: 400 }
      );
    }

    const releases = await getArtistRecentReleases(artistId, 5);

    return NextResponse.json({ releases });
  } catch (error) {
    console.error('Errore API release artista:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento delle release' },
      { status: 500 }
    );
  }
}