import { NextResponse } from 'next/server';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get('artist');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '10';

    if (!artistName) {
      return NextResponse.json(
        { error: 'Artist name is required' },
        { status: 400 }
      );
    }

    if (!NEWSAPI_KEY) {
      return NextResponse.json(
        { error: 'NewsAPI key not configured' },
        { status: 500 }
      );
    }

    // Query semplificata per l'artista (più probabile trovare risultati)
    const query = artistName;
    
    console.log(`📰 Fetching news for artist: ${artistName}`);

    // Usa everything endpoint con query semplice
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${NEWSAPI_KEY}`;

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
      id: article.url,
      title: article.title,
      description: article.description || article.content?.substring(0, 200) || '',
      url: article.url,
      image: article.urlToImage || 'https://placehold.co/800x450/667eea/ffffff?text=News',
      source: article.source.name,
      author: article.author,
      publishedAt: article.publishedAt,
    }));

    // Filtra articoli senza titolo o rimossi
    const validArticles = articles.filter(
      article => article.title && !article.title.includes('[Removed]')
    );

    console.log(`✅ Found ${validArticles.length} news for ${artistName}`);

    return NextResponse.json({
      articles: validArticles,
      totalResults: data.totalResults,
      artist: artistName,
    });

  } catch (error) {
    console.error('❌ Error fetching artist news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artist news', details: error.message },
      { status: 500 }
    );
  }
}