import { NextResponse } from 'next/server';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'music';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';

    if (!NEWSAPI_KEY) {
      return NextResponse.json(
        { error: 'NewsAPI key not configured' },
        { status: 500 }
      );
    }

    // Costruisci query per musica
    let query = '';
    let url = '';

    if (category === 'all') {
      // Articoli generici sulla musica
      query = 'music OR concert OR album OR artist OR song';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=it,en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else if (category === 'releases') {
      query = 'album release OR new album OR new single';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=it,en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else if (category === 'concerts') {
      query = 'concert OR tour OR festival';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=it,en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else if (category === 'industry') {
      query = 'music industry OR record label OR streaming';
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=it,en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    } else {
      // Default: top headlines entertainment
      url = `https://newsapi.org/v2/top-headlines?category=entertainment&language=it,en&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;
    }

    console.log(`📰 Fetching news: ${category}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      console.error('NewsAPI error:', data);
      return NextResponse.json(
        { error: data.message || 'NewsAPI error' },
        { status: 500 }
      );
    }

    // Formatta articoli
    const articles = data.articles.map(article => ({
      id: article.url, // Usa URL come ID unico
      title: article.title,
      description: article.description || article.content?.substring(0, 200) || '',
      url: article.url,
      image: article.urlToImage || 'https://placehold.co/800x450/667eea/ffffff?text=News',
      source: article.source.name,
      author: article.author,
      publishedAt: article.publishedAt,
      category: category,
    }));

    // Filtra articoli senza titolo o rimossi
    const validArticles = articles.filter(
      article => article.title && !article.title.includes('[Removed]')
    );

    console.log(`✅ Fetched ${validArticles.length} news articles`);

    return NextResponse.json({
      articles: validArticles,
      totalResults: data.totalResults,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

  } catch (error) {
    console.error('❌ Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: error.message },
      { status: 500 }
    );
  }
}