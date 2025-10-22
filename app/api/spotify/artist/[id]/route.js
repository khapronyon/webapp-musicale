// app/api/spotify/artist/[id]/route.js
// API Route per ottenere dettagli completi di un artista

import { getArtistDetails, getArtistTopTracks, getArtistAlbums, getRelatedArtists } from '@/lib/spotify';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID artista mancante' },
        { status: 400 }
      );
    }

    // Ottieni tutti i dati in parallelo per velocità
    const [artist, topTracks, albums, relatedArtists] = await Promise.all([
      getArtistDetails(id),
      getArtistTopTracks(id),
      getArtistAlbums(id),
      getRelatedArtists(id),
    ]);

    return NextResponse.json({
      artist,
      topTracks,
      albums,
      relatedArtists,
    });
  } catch (error) {
    console.error('Errore API dettagli artista:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento dei dettagli artista' },
      { status: 500 }
    );
  }
}