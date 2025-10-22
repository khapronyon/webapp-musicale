// app/api/spotify/releases/route.js
// API Route per ottenere le nuove release musicali

import { getNewReleases } from '@/lib/spotify';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Ottieni parametri opzionali dalla query string
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'IT';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Ottieni nuove release da Spotify
    const releases = await getNewReleases(country, limit);

    return NextResponse.json({ releases });
  } catch (error) {
    console.error('Errore API nuove release:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento delle release' },
      { status: 500 }
    );
  }
}