import Parser from 'rss-parser';
import { supabaseServer } from '@/lib/supabase-server';

// Lista RSS feeds musicali
const MUSIC_RSS_FEEDS = [
  {
    name: 'Pitchfork',
    url: 'https://pitchfork.com/rss/news/',
    genre: 'all',
    quality: 'high'
  },
  {
    name: 'NME',
    url: 'https://www.nme.com/feed',
    genre: 'rock/alternative',
    quality: 'high'
  },
  {
    name: 'Rolling Stone Music',
    url: 'https://www.rollingstone.com/music/feed/',
    genre: 'all',
    quality: 'high'
  },
  {
    name: 'Consequence',
    url: 'https://consequence.net/feed/',
    genre: 'all',
    quality: 'medium'
  },
  {
    name: 'Stereogum',
    url: 'https://www.stereogum.com/feed/',
    genre: 'indie/alternative',
    quality: 'high'
  },
  {
    name: 'Brooklyn Vegan',
    url: 'https://www.brooklynvegan.com/feed/',
    genre: 'indie/punk',
    quality: 'medium'
  }
];

// Cache in-memory (6 ore invece di 12)
let cachedNews = null;
let cacheTimestamp = null;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 ore in ms

export async function GET(request) {
  try {
    const startTime = Date.now();

    // 1. Controlla cache
    if (cachedNews && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      console.log('📦 Serving from cache');
      return Response.json({
        success: true,
        articles: cachedNews,
        count: cachedNews.length,
        cached: true,
        cacheAge: Math.floor((Date.now() - cacheTimestamp) / 1000 / 60) + ' minutes'
      });
    }

    // 2. Get user ID from query params (optional per filtrare per artisti seguiti)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let followedArtists = [];
    
    // 3. Se userId fornito, recupera artisti seguiti
    if (userId) {
      const { data, error } = await supabaseServer
        .from('followed_artists')
        .select('artist_name')
        .eq('user_id', userId);
      
      if (!error && data) {
        followedArtists = data.map(a => a.artist_name.toLowerCase());
        console.log('🎯 DEBUG - Followed artists:', followedArtists);
      } else {
        console.log('❌ DEBUG - Error fetching artists:', error);
      }
    }

    console.log(`🎸 Fetching news for ${followedArtists.length} followed artists`);

    // Blacklist keywords NON musicali (ESPANSA)
    const NON_MUSIC_KEYWORDS = [
      'game', 'gaming', 'video game', 'videogame', 'gamer',
      'tv show', 'tv series', 'television', 'netflix', 'hulu', 'disney+', 'hbo', 'amazon prime',
      'movie', 'film', 'cinema', 'actor', 'actress',
      'fortnite', 'minecraft', 'call of duty', 'valorant', 'league of legends',
      'stranger things', 'the simpsons', 'animal crossing', 'squid game',
      'zelda', 'lego', 'marvel', 'dc comics', 'star wars',
      'podcast', 'streamer', 'twitch', 'youtube video',
      'book', 'novel', 'author', 'writer',
      'comic', 'manga', 'anime'
    ];

    // 4. Parse tutti i feed RSS
    const parser = new Parser({
      timeout: 10000, // 10 sec timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MusicWebApp/1.0)'
      }
    });

    const allArticles = [];
    let feedsProcessed = 0;
    let feedsFailed = 0;

    for (const feed of MUSIC_RSS_FEEDS) {
      try {
        console.log(`📰 Fetching ${feed.name}...`);
        
        // Rate limiting: delay 2 secondi tra feed
        if (feedsProcessed > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const rssFeed = await parser.parseURL(feed.url);
        
        // Parse ogni articolo
        rssFeed.items.forEach(item => {
          // Estrai info base
          const article = {
            title: item.title || 'No title',
            link: item.link || item.guid || '#',
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            source: feed.name,
            sourceLogo: getSourceLogo(feed.name),
            description: item.contentSnippet || item.content || '',
            image: extractImageFromItem(item),
            category: feed.genre
          };

          // Se nessun artista seguito specificato, aggiungi tutti gli articoli
          if (followedArtists.length === 0) {
            allArticles.push(article);
          } else {
            // FILTRO STRICT: Match esatto nome artista + Blacklist keywords
            const contentLower = (article.title + ' ' + article.description).toLowerCase();
            
            // 1. Check blacklist PRIMA (elimina articoli non musicali)
            const hasBlacklistedKeyword = NON_MUSIC_KEYWORDS.some(keyword => 
              contentLower.includes(keyword)
            );
            
            if (hasBlacklistedKeyword) {
              // Skip articolo non musicale
              console.log('⚫ BLACKLISTED:', article.title.substring(0, 50));
              return;
            }
            
            // 2. Match artista seguito (STRICT)
            const matchedArtist = followedArtists.find(artist => {
              // Match esatto nome completo (con word boundaries)
              const regex = new RegExp(`\\b${artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              return regex.test(contentLower);
            });
            
            if (matchedArtist) {
              article.matchedArtist = matchedArtist;
              allArticles.push(article);
              console.log('✅ MATCHED:', article.title.substring(0, 50), '→', matchedArtist);
            } else {
              console.log('❌ NO MATCH:', article.title.substring(0, 50));
            }
          }
        });

        feedsProcessed++;
        console.log(`✅ ${feed.name}: ${rssFeed.items.length} articoli`);

      } catch (error) {
        feedsFailed++;
        console.error(`❌ Error fetching ${feed.name}:`, error.message);
      }
    }

    // 5. Ordina per data (più recenti primi)
    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // 6. Filtra ultimi 30 giorni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentArticles = allArticles.filter(article => 
      new Date(article.pubDate) >= thirtyDaysAgo
    );

    // 7. Limita a 50 articoli più recenti
    const limitedArticles = recentArticles.slice(0, 50);

    // 8. Salva in cache
    cachedNews = limitedArticles;
    cacheTimestamp = Date.now();

    const executionTime = Date.now() - startTime;

    console.log(`✅ Aggregation complete: ${limitedArticles.length} articoli in ${executionTime}ms`);

    return Response.json({
      success: true,
      articles: limitedArticles,
      count: limitedArticles.length,
      stats: {
        feedsProcessed,
        feedsFailed,
        totalArticles: allArticles.length,
        filteredArticles: recentArticles.length,
        executionTime: executionTime + 'ms'
      },
      cached: false
    });

  } catch (error) {
    console.error('❌ RSS Feed Error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message,
        details: 'Failed to fetch RSS feeds'
      },
      { status: 500 }
    );
  }
}

// Helper: Estrai immagine da RSS item
function extractImageFromItem(item) {
  // Prova vari formati RSS per immagini
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  
  if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
    return item['media:thumbnail'].$.url;
  }
  
  // Cerca immagine nel content HTML
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }
  
  // Fallback: nessuna immagine
  return null;
}

// Helper: Logo fonte
function getSourceLogo(sourceName) {
  const logos = {
    'Pitchfork': 'https://cdn.pitchfork.com/assets/misc/favicon.ico',
    'NME': 'https://www.nme.com/wp-content/themes/nme/assets/img/nme-logo.svg',
    'Rolling Stone Music': 'https://www.rollingstone.com/wp-content/themes/rolling-stone/assets/images/rs-logo.svg',
    'Consequence': 'https://consequence.net/wp-content/themes/consequence/assets/build/images/consequence-logo.svg',
    'Stereogum': 'https://www.stereogum.com/wp-content/themes/stereogum/assets/images/stereogum-logo.svg',
    'Brooklyn Vegan': 'https://www.brooklynvegan.com/files/img/bv-logo.png'
  };
  
  return logos[sourceName] || null;
}