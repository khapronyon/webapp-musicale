import { supabaseServer } from '@/lib/supabase-server';

// Configurazione
const USERS_PER_BATCH = 30; // Utenti processati per run
const MAX_EXECUTION_TIME = 45000; // 45 secondi (buffer 15s)
const SPOTIFY_DELAY = 200; // Delay tra richieste Spotify (ms)
const RELEASE_WINDOW_HOURS = 6; // Controlla release ultime 6 ore

export async function GET(request) {
  const startTime = Date.now();
  
  try {
    // 1. VERIFICA CRON_SECRET per sicurezza
    const authHeader = request.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedSecret) {
      console.error('❌ Unauthorized cron attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Cron job started:', new Date().toISOString());

    // 2. RECUPERA STATO CHECKPOINT
    const { data: cronState, error: stateError } = await supabaseServer
      .from('cron_state')
      .select('*')
      .eq('job_name', 'check-new-releases')
      .single();

    if (stateError) {
      console.error('❌ Error fetching cron state:', stateError);
      return Response.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('📊 Checkpoint state:', {
      lastProcessedUserId: cronState.last_processed_user_id,
      lastRunAt: cronState.last_run_at
    });

    // 3. AGGIORNA STATO A "RUNNING"
    await supabaseServer
      .from('cron_state')
      .update({ 
        status: 'running',
        last_run_at: new Date().toISOString()
      })
      .eq('job_name', 'check-new-releases');

    // 4. RECUPERA BATCH DI UTENTI (dopo checkpoint)
    let usersQuery = supabaseServer
      .from('profiles')
      .select('id, nickname')
      .eq('notification_enabled', true)
      .order('id', { ascending: true })
      .limit(USERS_PER_BATCH);

    // Se c'è un checkpoint, prendi utenti DOPO quello
    if (cronState.last_processed_user_id) {
      usersQuery = usersQuery.gt('id', cronState.last_processed_user_id);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw new Error('Failed to fetch users');
    }

    console.log(`👥 Found ${users.length} users to process`);

    // Se non ci sono più utenti, reset checkpoint
    if (users.length === 0) {
      console.log('🔄 No more users, resetting checkpoint...');
      await supabaseServer
        .from('cron_state')
        .update({ 
          last_processed_user_id: null,
          status: 'completed'
        })
        .eq('job_name', 'check-new-releases');
      
      return Response.json({ 
        message: 'Cycle completed, checkpoint reset',
        usersProcessed: 0,
        notificationsCreated: 0
      });
    }

    // 5. OTTIENI TOKEN SPOTIFY
    const spotifyToken = await getSpotifyToken();
    if (!spotifyToken) {
      throw new Error('Failed to get Spotify token');
    }

    // 6. PROCESSA OGNI UTENTE
    let totalNotifications = 0;
    let lastProcessedUserId = null;

    for (const user of users) {
      // Check timeout safety
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log('⏰ Approaching timeout, saving progress...');
        break;
      }

      console.log(`🔍 Processing user: ${user.nickname} (${user.id})`);

      try {
        // Recupera artisti seguiti dall'utente
        const { data: followedArtists } = await supabaseServer
          .from('followed_artists')
          .select('artist_id, artist_name, artist_image')
          .eq('user_id', user.id);

        if (!followedArtists || followedArtists.length === 0) {
          console.log(`  ⚠️ User has no followed artists, skipping`);
          lastProcessedUserId = user.id;
          continue;
        }

        console.log(`  📌 Checking ${followedArtists.length} artists...`);

        // Controlla release per ogni artista
        for (const artist of followedArtists) {
          // Check timeout per ogni artista
          if (Date.now() - startTime > MAX_EXECUTION_TIME) {
            console.log('⏰ Timeout during artist processing');
            break;
          }

          // Delay per rate limiting
          await sleep(SPOTIFY_DELAY);

          // Recupera release recenti dell'artista
          const releases = await getArtistRecentReleases(
            artist.artist_id, 
            spotifyToken
          );

          // Filtra solo release nelle ultime 6 ore
          const newReleases = filterRecentReleases(releases, RELEASE_WINDOW_HOURS);

          if (newReleases.length > 0) {
            console.log(`  🎵 Found ${newReleases.length} new releases for ${artist.artist_name}`);

            // Crea notifica per ogni release
            for (const release of newReleases) {
              const notificationCreated = await createNotification(
                user.id,
                artist,
                release
              );

              if (notificationCreated) {
                totalNotifications++;
              }
            }
          }
        }

        lastProcessedUserId = user.id;

      } catch (userError) {
        console.error(`❌ Error processing user ${user.nickname}:`, userError);
        // Continua con prossimo utente
        lastProcessedUserId = user.id;
        continue;
      }
    }

    // 7. SALVA CHECKPOINT
    const updateData = {
      last_processed_user_id: lastProcessedUserId,
      total_users_processed: (cronState.total_users_processed || 0) + users.length,
      total_notifications_created: (cronState.total_notifications_created || 0) + totalNotifications,
      status: 'idle',
      error_message: null,
      updated_at: new Date().toISOString()
    };

    await supabaseServer
      .from('cron_state')
      .update(updateData)
      .eq('job_name', 'check-new-releases');

    const executionTime = Date.now() - startTime;
    console.log('✅ Cron job completed:', {
      usersProcessed: users.length,
      notificationsCreated: totalNotifications,
      executionTime: `${executionTime}ms`,
      nextCheckpoint: lastProcessedUserId
    });

    return Response.json({
      success: true,
      usersProcessed: users.length,
      notificationsCreated: totalNotifications,
      executionTime,
      nextCheckpoint: lastProcessedUserId
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);

    // Salva errore nello stato
    await supabaseServer
      .from('cron_state')
      .update({
        status: 'error',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('job_name', 'check-new-releases');

    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// ========== FUNZIONI HELPER ==========

// Ottiene token Spotify OAuth
async function getSpotifyToken() {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID + ':' + 
          process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('❌ Spotify token error:', error);
    return null;
  }
}

// Recupera release recenti di un artista
async function getArtistRecentReleases(artistId, token) {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      console.error(`Spotify API error for artist ${artistId}:`, response.status);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching releases for artist ${artistId}:`, error);
    return [];
  }
}

// Filtra solo release pubblicate nelle ultime X ore
function filterRecentReleases(releases, hours) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  return releases.filter(release => {
    const releaseDate = new Date(release.release_date);
    return releaseDate >= cutoffDate;
  });
}

// Crea notifica nel database (evita duplicati)
async function createNotification(userId, artist, release) {
  try {
    // Controlla se esiste già notifica per questa release
    const { data: existing } = await supabaseServer
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('release_id', release.id)
      .single();

    if (existing) {
      console.log(`  ⚠️ Notification already exists for release ${release.name}`);
      return false;
    }

    // Crea nuova notifica
    const { error } = await supabaseServer
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'new_release',
        title: `Nuova release: ${release.name}`,
        message: `${artist.artist_name} ha pubblicato "${release.name}"`,
        link: release.external_urls?.spotify || null,
        artist_id: artist.artist_id,
        artist_name: artist.artist_name,
        artist_image: artist.artist_image,
        release_id: release.id,
        release_name: release.name,
        release_image: release.images?.[0]?.url || null,
        read: false
      });

    if (error) {
      console.error('  ❌ Error creating notification:', error);
      return false;
    }

    console.log(`  ✅ Notification created for: ${release.name}`);
    return true;

  } catch (error) {
    console.error('  ❌ Notification creation error:', error);
    return false;
  }
}

// Sleep helper per delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}