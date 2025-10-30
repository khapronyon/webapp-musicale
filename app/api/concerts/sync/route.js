import { supabaseServer } from '@/lib/supabase-server';

// Rate limiting config
const DELAY_BETWEEN_REQUESTS = 200; // ms (5 req/sec max Ticketmaster)
const MAX_ARTISTS_PER_RUN = 20; // Processa max 20 artisti per chiamata

export async function GET(request) {
  const startTime = Date.now();
  
  try {
    console.log('🎵 Starting concerts sync...');
    
    // 1. Recupera tutti gli artisti seguiti univoci
    const { data: followedArtists, error: artistsError } = await supabaseServer
      .from('followed_artists')
      .select('artist_id, artist_name')
      .order('followed_at', { ascending: false })
      .limit(MAX_ARTISTS_PER_RUN);

    if (artistsError) {
      console.error('❌ Error fetching artists:', artistsError);
      return Response.json({ error: 'Database error' }, { status: 500 });
    }

    // Rimuovi duplicati (stesso artista seguito da più utenti)
    const uniqueArtists = Array.from(
      new Map(followedArtists.map(a => [a.artist_id, a])).values()
    );

    console.log(`📊 Found ${uniqueArtists.length} unique artists to check`);

    let totalConcertsAdded = 0;
    let totalConcertsUpdated = 0;

    // 2. Per ogni artista, recupera concerti da Ticketmaster
    for (const artist of uniqueArtists) {
      await sleep(DELAY_BETWEEN_REQUESTS);

      try {
        console.log(`🔍 Checking concerts for: ${artist.artist_name}`);
        
        const concerts = await fetchTicketmasterEvents(artist.artist_name);
        
        if (concerts.length > 0) {
          console.log(`  ✅ Found ${concerts.length} concerts`);

          // 3. Salva concerti nel database
          for (const concert of concerts) {
            const concertData = {
              event_id: concert.id,
              event_name: concert.name,
              event_url: concert.url,
              event_image: concert.images?.[0]?.url || null,
              artist_id: artist.artist_id,
              artist_name: artist.artist_name,
              event_date: concert.dates?.start?.localDate || null,
              event_time: concert.dates?.start?.localTime || null,
              event_datetime: concert.dates?.start?.dateTime || null,
              timezone: concert.dates?.timezone || null,
              venue_id: concert._embedded?.venues?.[0]?.id || null,
              venue_name: concert._embedded?.venues?.[0]?.name || 'TBA',
              venue_address: concert._embedded?.venues?.[0]?.address?.line1 || null,
              venue_city: concert._embedded?.venues?.[0]?.city?.name || 'TBA',
              venue_state: concert._embedded?.venues?.[0]?.state?.stateCode || null,
              venue_country: concert._embedded?.venues?.[0]?.country?.countryCode || 'N/A',
              venue_postal_code: concert._embedded?.venues?.[0]?.postalCode || null,
              latitude: parseFloat(concert._embedded?.venues?.[0]?.location?.latitude) || null,
              longitude: parseFloat(concert._embedded?.venues?.[0]?.location?.longitude) || null,
              ticket_url: concert.url || null,
              ticket_status: concert.dates?.status?.code || 'unknown',
              price_min: concert.priceRanges?.[0]?.min || null,
              price_max: concert.priceRanges?.[0]?.max || null,
              currency: concert.priceRanges?.[0]?.currency || 'EUR',
              genre: concert.classifications?.map(c => c.genre?.name).filter(Boolean) || [],
              event_type: concert.classifications?.[0]?.segment?.name || 'Concert',
              last_synced_at: new Date().toISOString()
            };

            // Upsert (insert o update se esiste già)
            const { error: upsertError } = await supabaseServer
              .from('concerts')
              .upsert(concertData, {
                onConflict: 'event_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`  ❌ Error saving concert ${concert.name}:`, upsertError);
            } else {
              totalConcertsAdded++;
            }
          }
        } else {
          console.log(`  ℹ️ No concerts found`);
        }

      } catch (artistError) {
        console.error(`  ❌ Error for artist ${artist.artist_name}:`, artistError);
        // Continua con prossimo artista
        continue;
      }
    }

    const executionTime = Date.now() - startTime;
    const result = {
      success: true,
      artistsChecked: uniqueArtists.length,
      concertsAdded: totalConcertsAdded,
      concertsUpdated: totalConcertsUpdated,
      executionTime: `${executionTime}ms`
    };

    console.log('✅ Sync completed:', result);
    return Response.json(result);

  } catch (error) {
    console.error('❌ Sync error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// ========== HELPER FUNCTIONS ==========

async function fetchTicketmasterEvents(artistName) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('TICKETMASTER_API_KEY not configured');
  }

  try {
    // Cerca eventi per keyword (nome artista)
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(artistName)}&apikey=${apiKey}&size=50&sort=date,asc`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('⚠️ Rate limit hit, waiting...');
        await sleep(1000);
        return [];
      }
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data._embedded?.events) {
      // Filtra solo concerti futuri
      const now = new Date();
      return data._embedded.events.filter(event => {
        const eventDate = new Date(event.dates?.start?.dateTime || event.dates?.start?.localDate);
        return eventDate >= now;
      });
    }

    return [];

  } catch (error) {
    console.error(`Error fetching Ticketmaster for ${artistName}:`, error);
    return [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}