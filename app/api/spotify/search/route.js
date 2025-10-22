// app/api/spotify/search/route.js
// API Route per cercare artisti su Spotify

import { searchArtists } from '@/lib/spotify';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Ottieni il parametro di ricerca dalla query string
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validazione
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query di ricerca mancante' },
        { status: 400 }
      );
    }

    // Cerca artisti su Spotify
    const artists = await searchArtists(query);

    return NextResponse.json({ artists });
  } catch (error) {
    console.error('Errore API ricerca Spotify:', error);
    return NextResponse.json(
      { error: 'Errore durante la ricerca su Spotify' },
      { status: 500 }
    );
  }
}