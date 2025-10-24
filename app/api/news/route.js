import { NextResponse } from 'next/server';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

// Mock data fallback
function getMockNews(category) {
  const mockArticles = [
    {
      id: 'mock-1',
      title: 'Taylor Swift Breaks Streaming Record with Latest Album',
      description: 'Pop superstar Taylor Swift has broken yet another streaming record, with her latest album reaching 1 billion streams in its first week.',
      url: 'https://example.com/news/taylor-swift-record',
      image: 'https://placehold.co/800x450/667eea/ffffff?text=Music+News',
      source: 'Music Weekly',
      author: 'Sarah Johnson',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      category: 'releases',
    },
    {
      id: 'mock-2',
      title: 'Summer Music Festivals Announce 2026 Lineups',
      description: 'Major music festivals around the world have begun announcing their 2026 lineups, featuring a mix of legendary acts and rising stars.',
      url: 'https://example.com/news/festival-lineups',
      image: 'https://placehold.co/800x450/764ba2/ffffff?text=Festivals',
      source: 'Festival Guide',
      author: 'Mike Chen',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      category: 'concerts',
    },
    {
      id: 'mock-3',
      title: 'Streaming Services See Record Growth in Music Consumption',
      description: 'New data shows streaming services have seen unprecedented growth, with music consumption reaching all-time highs globally.',
      url: 'https://example.com/news/streaming-growth',
      image: 'https://placehold.co/800x450/f093fb/ffffff?text=Industry+News',
      source: 'Music Business',
      author: 'Alex Brown',
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      category: 'industry',
    },
    {
      id: 'mock-4',
      title: 'Indie Band Releases Surprise Album to Critical Acclaim',
      description: 'An independent band has surprised fans with a surprise album drop, receiving widespread critical acclaim and commercial success.',
      url: 'https://example.com/news/indie-album',
      image: 'https://placehold.co/800x450/4facfe/ffffff?text=New+Music',
      source: 'Indie Spotlight',
      author: 'Emma Wilson',
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      category: 'releases',
    },
    {
      id: 'mock-5',
      title: 'Historic Concert Venue Announces Major Renovation',
      description: 'A legendary concert venue has announced plans for a major renovation, promising enhanced acoustics and modern amenities.',
      url: 'https://example.com/news/venue-renovation',
      image: 'https://placehold.co/800x450/667eea/ffffff?text=Venues',
      source: 'Concert News',
      author: 'David Lee',
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      category: 'concerts',
    },
  ];

  if (category === 'all') {
    return mockArticles;
  }
  
  return mockArticles.filter(a => a.category === category);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'music';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';
    const useMock = searchParams.get('mock') === 'true';

    // Se mock richiesto esplicitamente o NewsAPI non configurato
    if (useMock || !NEWSAPI_KEY) {
      console.log('📰 Using MOCK news data');
      const mockNews = getMockNews(category);
      
      return NextResponse.json({
        articles: mockNews,
        totalResults: mockNews.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        mock: true,
      });
    }

    // Costruisci query per musica (MIGLIORATE)
    let url = '';

    if (category === 'all') {
      // Per "Tutte": mix di entertainment e musica
      url = `https://newsapi.org/v2/top-headlines?category=entertainment&country=us&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else if (category === 'releases') {
      const query = 'album OR single OR music release';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else if (category === 'concerts') {
      const query = 'concert OR tour OR music festival';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else if (category === 'industry') {
      const query = 'music industry OR streaming OR spotify';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else {
      url = `https://newsapi.org/v2/top-headlines?category=entertainment&language=en&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    }

    console.log(`📰 Fetching news: ${category}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      console.error('NewsAPI error:', data);
      
      // Fallback a mock se API fallisce
      console.log('⚠️ NewsAPI failed, using MOCK data as fallback');
      const mockNews = getMockNews(category);
      
      return NextResponse.json({
        articles: mockNews,
        totalResults: mockNews.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        mock: true,
        apiError: data.message,
      });
    }

    // Formatta articoli
    const articles = data.articles.map(article => ({
      id: article.url,
      title: article.title,
      description: article.description || article.content?.substring(0, 200) || '',
      url: article.url,
      image: article.urlToImage || 'https://placehold.co/800x450/667eea/ffffff?text=News',
      source: article.source.name,
      author: article.author,
      publishedAt: article.publishedAt,
      category: category,
    }));

    const validArticles = articles.filter(
      article => article.title && !article.title.includes('[Removed]')
    );

    // Se nessun articolo valido, usa mock come fallback
    if (validArticles.length === 0) {
      console.log('⚠️ No valid articles, using MOCK data as fallback');
      const mockNews = getMockNews(category);
      
      return NextResponse.json({
        articles: mockNews,
        totalResults: mockNews.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        mock: true,
      });
    }

    console.log(`✅ Fetched ${validArticles.length} news articles`);

    return NextResponse.json({
      articles: validArticles,
      totalResults: data.totalResults,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      mock: false,
    });

  } catch (error) {
    console.error('❌ Error fetching news:', error);
    
    // Fallback finale a mock
    console.log('⚠️ Exception caught, using MOCK data as fallback');
    const category = new URL(request.url).searchParams.get('category') || 'all';
    const mockNews = getMockNews(category);
    
    return NextResponse.json({
      articles: mockNews,
      totalResults: mockNews.length,
      page: 1,
      pageSize: 20,
      mock: true,
      error: error.message,
    });
  }
}