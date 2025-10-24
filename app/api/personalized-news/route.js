import { NextResponse } from 'next/server';

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

// Cache in-memory
const newsCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 ore (riduce chiamate API)

export async function POST(request) {
  try {
    const body = await request.json();
    const { artistNames, page = 1, pageSize = 10 } = body;

    console.log(`📰 Received request for ${artistNames?.length || 0} artists`);

    if (!GNEWS_API_KEY) {
      console.warn('⚠️ GNEWS_API_KEY not configured - using fallback mock data');
      console.warn('👉 Register at https://gnews.io to get real news');
      
      // Fallback a mock ma con indicazione chiara
      return NextResponse.json({
        articles: getFallbackMockNews(artistNames || []),
        totalResults: 10,
        personalized: artistNames?.length > 0,
        mock: true,
        warningMessage: 'Using demo articles. Register at gnews.io for real news.',
        followedArtistsCount: artistNames?.length || 0,
      });
    }

    if (!artistNames || !Array.isArray(artistNames) || artistNames.length === 0) {
      console.log('📰 No artists provided, fetching general music news');
      return await fetchGeneralMusicNews(pageSize);
    }

    console.log(`🔍 Fetching news for artists:`, artistNames.slice(0, 5));

    // Crea cache key
    const cacheKey = `news_${artistNames.sort().join(',')}_${page}`;

    // Controlla cache
    if (newsCache.has(cacheKey)) {
      const cached = newsCache.get(cacheKey);
      const age = Date.now() - cached.timestamp;
      
      if (age < CACHE_DURATION) {
        console.log(`✅ Cache HIT (${Math.floor(age / 60000)}min old) - Returning ${cached.articles.length} articles`);
        return NextResponse.json({
          articles: cached.articles,
          totalResults: cached.articles.length,
          personalized: true,
          cached: true,
          followedArtistsCount: artistNames.length,
        });
      } else {
        console.log('⏰ Cache expired, fetching fresh news');
        newsCache.delete(cacheKey);
      }
    }

    console.log('🌐 Fetching from GNews API...');

    let allArticles = [];
    
    // Strategia: cerca solo per i primi 3 artisti (ridotto da 5 per evitare rate limit)
    const topArtists = artistNames.slice(0, Math.min(3, artistNames.length));
    
    for (const artistName of topArtists) {
      try {
        // Query con nome artista + "music" per risultati più pertinenti
        const query = `${artistName} music`;
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=3&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
        
        console.log(`🔍 Searching: "${query}"`);
        
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.articles && data.articles.length > 0) {
          console.log(`✅ Found ${data.articles.length} articles for ${artistName}`);
          
          // Formatta articoli
          const formatted = data.articles.map(article => ({
            id: article.url,
            title: article.title,
            description: article.description || article.content?.substring(0, 200) || '',
            url: article.url,
            image: article.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
            source: article.source.name,
            author: article.source.name,
            publishedAt: article.publishedAt,
          }));
          
          allArticles.push(...formatted);
        } else {
          console.log(`⚠️ No articles found for ${artistName}`);
          if (data.errors) {
            console.error('GNews errors:', data.errors);
          }
        }

        // Delay per evitare rate limit (GNews: max 10 richieste/minuto)
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 secondo tra richieste

        // Se abbiamo abbastanza articoli, fermiamoci
        if (allArticles.length >= pageSize) {
          console.log(`✅ Collected enough articles (${allArticles.length}), stopping search`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error fetching news for ${artistName}:`, error.message);
        continue;
      }
    }

    // Se pochi risultati, aggiungi news musicali generiche
    if (allArticles.length < 5) {
      console.log(`⚠️ Only ${allArticles.length} personalized articles, adding general music news`);
      
      try {
        const generalUrl = `https://gnews.io/api/v4/search?q=music&lang=en&max=${Math.min(10 - allArticles.length, 10)}&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
        const response = await fetch(generalUrl);
        const data = await response.json();

        if (response.ok && data.articles) {
          const formatted = data.articles.map(article => ({
            id: article.url,
            title: article.title,
            description: article.description || article.content?.substring(0, 200) || '',
            url: article.url,
            image: article.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
            source: article.source.name,
            author: article.source.name,
            publishedAt: article.publishedAt,
          }));
          
          allArticles.push(...formatted);
          console.log(`✅ Added ${formatted.length} general music articles`);
        }
      } catch (error) {
        console.error('❌ Error fetching general news:', error);
      }
    }

    // Rimuovi duplicati
    const uniqueArticles = Array.from(
      new Map(allArticles.map(a => [a.url, a])).values()
    );

    // Ordina per data (più recenti prima)
    uniqueArticles.sort((a, b) => 
      new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    // Limita al pageSize richiesto
    const finalArticles = uniqueArticles.slice(0, pageSize);

    console.log(`✅ Returning ${finalArticles.length} REAL articles`);
    console.log(`📅 Date range: ${new Date(finalArticles[0]?.publishedAt).toLocaleString()} - ${new Date(finalArticles[finalArticles.length - 1]?.publishedAt).toLocaleString()}`);

    // Salva in cache (1 ora)
    newsCache.set(cacheKey, {
      articles: finalArticles,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      articles: finalArticles,
      totalResults: finalArticles.length,
      personalized: true,
      cached: false,
      followedArtistsCount: artistNames.length,
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return NextResponse.json({
      error: error.message,
      articles: [],
      mock: false,
    }, { status: 500 });
  }
}

async function fetchGeneralMusicNews(pageSize) {
  try {
    console.log('🌐 Fetching general music news from GNews');
    
    const url = `https://gnews.io/api/v4/search?q=music&lang=en&max=${pageSize}&sortby=publishedAt&apikey=${GNEWS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data.articles) {
      const formatted = data.articles.map(article => ({
        id: article.url,
        title: article.title,
        description: article.description || article.content?.substring(0, 200) || '',
        url: article.url,
        image: article.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
        source: article.source.name,
        author: article.source.name,
        publishedAt: article.publishedAt,
      }));

      console.log(`✅ Returning ${formatted.length} general music articles`);

      return NextResponse.json({
        articles: formatted,
        totalResults: formatted.length,
        personalized: false,
        cached: false,
      });
    }

    throw new Error('No articles from GNews');

  } catch (error) {
    console.error('❌ Error fetching general news:', error);
    return NextResponse.json({
      error: 'Failed to fetch news',
      articles: [],
    }, { status: 500 });
  }
}

// Fallback mock per quando GNews non è configurato
function getFallbackMockNews(artistNames) {
  const mockTemplates = [
    {
      id: 'mock-1',
      title: '{artist} Announces Surprise Album Release',
      description: 'Fans excited as {artist} reveals unexpected new album coming soon.',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      source: 'Music News Daily',
      publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'mock-2',
      title: '{artist} World Tour Dates Announced',
      description: '{artist} reveals massive world tour spanning multiple continents.',
      image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
      source: 'Tour News',
      publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'mock-3',
      title: '{artist} Collaborates With Rising Stars',
      description: 'Exciting new collaboration announced by {artist}.',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
      source: 'Billboard',
      publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ];

  const articles = [];
  
  if (artistNames.length > 0) {
    // Crea articoli per i primi artisti
    artistNames.slice(0, 3).forEach((artist, i) => {
      const template = mockTemplates[i % mockTemplates.length];
      articles.push({
        ...template,
        id: `mock-${artist}-${i}`,
        title: template.title.replace('{artist}', artist),
        description: template.description.replace(/{artist}/g, artist),
        url: `https://www.google.com/search?q=${encodeURIComponent(artist + ' music news')}`,
        author: template.source,
      });
    });
  }
  
  // Aggiungi articoli generici
  articles.push({
    id: 'mock-general-1',
    title: 'Music Streaming Reaches All-Time High',
    description: 'Global music streaming continues growth trajectory with record numbers.',
    url: 'https://www.musicbusinessworldwide.com',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    source: 'Music Business',
    author: 'Industry News',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
  });

  return articles;
}