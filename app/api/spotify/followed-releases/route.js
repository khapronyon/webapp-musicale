// app/api/spotify/followed-releases/route.js
// API Route per ottenere le release degli artisti seguiti

import { getArtistRecentReleases } from '@/lib/spotify';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    // Ottieni user_id dalla query string
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID mancante' },
        { status: 400 }
      );
    }

    // Ottieni artisti seguiti dall'utente
    const { data: followedArtists, error: followError } = await supabase
      .from('followed_artists')
      .select('artist_id, artist_name, artist_image')
      .eq('user_id', userId);

    if (followError) {
      console.error('Errore Supabase:', followError);
      throw followError;
    }

    if (!followedArtists || followedArtists.length === 0) {
      return NextResponse.json({ releases: [] });
    }

    console.log(`Trovati ${followedArtists.length} artisti seguiti`);

    // Ottieni release per ogni artista seguito (max 5 per artista)
    const releasesPromises = followedArtists.map(artist =>
      getArtistRecentReleases(artist.artist_id, 5)
        .then(releases => {
          console.log(`Artista ${artist.artist_name}: ${releases.length} release`);
          return releases.map(release => ({
            ...release,
            artistName: artist.artist_name,
            artistImage: artist.artist_image,
          }));
        })
        .catch(err => {
          console.error(`Errore per artista ${artist.artist_name}:`, err);
          return [];
        })
    );

    const allReleases = await Promise.all(releasesPromises);
    
    // Flatten array e ordina per data di release (più recenti prima)
    const flatReleases = allReleases
      .flat()
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    console.log(`Totale release trovate: ${flatReleases.length}`);

    return NextResponse.json({ releases: flatReleases });
  } catch (error) {
    console.error('Errore API release artisti seguiti:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento delle release', details: error.message },
      { status: 500 }
    );
  }
}