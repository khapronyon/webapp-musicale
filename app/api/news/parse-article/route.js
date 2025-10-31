import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Suppress JSDOM CSS warnings (they're harmless)
const originalConsoleError = console.error;
const jsDomCssError = /Could not parse CSS stylesheet/;
console.error = (...args) => {
  if (args[0] && jsDomCssError.test(args[0])) {
    return; // Ignore CSS parsing warnings
  }
  originalConsoleError(...args);
};

// Cache in-memory per articoli parsati
const articleCache = new Map();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni (articoli news non cambiano)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleUrl = searchParams.get('url');

    // 1. Validazione URL
    if (!articleUrl) {
      return Response.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validazione URL format
    try {
      new URL(articleUrl);
    } catch (e) {
      return Response.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`📖 Parsing article: ${articleUrl}`);

    // 2. Check cache
    const cached = articleCache.get(articleUrl);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('📦 Serving from cache');
      return Response.json({
        success: true,
        article: cached.data,
        cached: true
      });
    }

    console.log('🌐 Fetching fresh content...');

    // 3. Fetch HTML della pagina
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout per articoli complessi
    
    let html; // ✅ Dichiarata qui per essere accessibile fuori dal try
    let fetchTime;
    
    try {
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      html = await response.text();
      fetchTime = Date.now() - startTime;

      console.log(`✅ HTML fetched in ${fetchTime}ms (${html.length} bytes)`);
      
      // 3.5. Pre-process: Remove heavy elements BEFORE JSDOM (speed optimization)
      console.log('🧹 Cleaning HTML...');
      html = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<link[^>]*stylesheet[^>]*>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
      
      console.log(`✅ Cleaned to ${html.length} bytes`);
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout (30s exceeded) - Article too large');
      }
      throw fetchError;
    }

    // 4. Parse con JSDOM (optimized)
    console.log('🔨 Creating JSDOM...');
    const dom = new JSDOM(html, { 
      url: articleUrl,
      // Performance optimizations
      resources: 'usable',
      runScripts: 'outside-only',
      pretendToBeVisual: false
    });
    const document = dom.window.document;

    // 5. Estrai metadata prima di Readability
    const metadata = extractMetadata(document, articleUrl);

    // 6. Parse con Mozilla Readability
    const parseStart = Date.now();
    const reader = new Readability(document, {
      charThreshold: 100, // Minimo 100 caratteri
      classesToPreserve: ['caption', 'credit'], // Mantieni credits immagini
    });
    
    let article = reader.parse();  // ✅ Changed to 'let' for reassignment
    const parseTime = Date.now() - parseStart;

    console.log(`✅ Parsed in ${parseTime}ms`);

    if (!article) {
      // Fallback: prova estrazione manuale base
      console.log('⚠️ Readability failed, trying manual extraction');
      const manualArticle = manualExtraction(document, metadata);
      
      if (!manualArticle) {
        return Response.json({
          success: false,
          error: 'Unable to parse article content',
          message: 'This article cannot be displayed in reader mode. Please open the original link.',
          originalUrl: articleUrl
        }, { status: 422 });
      }
      
      article = manualArticle;
    }

    // 7. Clean e format contenuto
    const cleanedContent = cleanContent(article.content);

    // 8. Estrai immagini dal contenuto
    const images = extractImages(article.content, articleUrl);

    // 9. Crea oggetto articolo finale
    const parsedArticle = {
      title: article.title || metadata.title || 'Untitled',
      content: cleanedContent,
      textContent: article.textContent?.substring(0, 500) || '', // Prime 500 chars per preview
      excerpt: article.excerpt || metadata.description || '',
      byline: article.byline || metadata.author || '',
      siteName: article.siteName || metadata.siteName || extractDomain(articleUrl),
      publishedTime: metadata.publishedTime || null,
      images: images,
      featuredImage: metadata.image || (images.length > 0 ? images[0] : null),
      originalUrl: articleUrl,
      wordCount: article.length || 0,
      readingTime: Math.ceil((article.length || 0) / 200) || 1 // ~200 parole/min
    };

    // 10. Salva in cache
    articleCache.set(articleUrl, {
      data: parsedArticle,
      timestamp: Date.now()
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ Article parsed successfully in ${totalTime}ms`);

    return Response.json({
      success: true,
      article: parsedArticle,
      cached: false,
      stats: {
        fetchTime: fetchTime + 'ms',
        parseTime: parseTime + 'ms',
        totalTime: totalTime + 'ms'
      }
    });

  } catch (error) {
    console.error('❌ Parse Article Error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Article URL:', articleUrl);
    
    return Response.json({
      success: false,
      error: error.message,
      errorType: error.name,
      message: 'Unable to parse article. Please try opening the original link.',
      originalUrl: articleUrl
    }, { status: 500 });
  }
}

// Helper: Estrai metadata da document
function extractMetadata(document, url) {
  const metadata = {
    title: null,
    description: null,
    image: null,
    author: null,
    publishedTime: null,
    siteName: null
  };

  // Open Graph tags
  metadata.title = document.querySelector('meta[property="og:title"]')?.content;
  metadata.description = document.querySelector('meta[property="og:description"]')?.content;
  metadata.image = document.querySelector('meta[property="og:image"]')?.content;
  metadata.siteName = document.querySelector('meta[property="og:site_name"]')?.content;

  // Twitter Card tags (fallback)
  if (!metadata.title) {
    metadata.title = document.querySelector('meta[name="twitter:title"]')?.content;
  }
  if (!metadata.description) {
    metadata.description = document.querySelector('meta[name="twitter:description"]')?.content;
  }
  if (!metadata.image) {
    metadata.image = document.querySelector('meta[name="twitter:image"]')?.content;
  }

  // Standard meta tags (fallback)
  if (!metadata.description) {
    metadata.description = document.querySelector('meta[name="description"]')?.content;
  }

  // Title tag (fallback)
  if (!metadata.title) {
    metadata.title = document.querySelector('title')?.textContent;
  }

  // Author
  metadata.author = document.querySelector('meta[name="author"]')?.content;

  // Published time
  metadata.publishedTime = document.querySelector('meta[property="article:published_time"]')?.content;

  // Converti immagine relativa in assoluta
  if (metadata.image && !metadata.image.startsWith('http')) {
    try {
      metadata.image = new URL(metadata.image, url).href;
    } catch (e) {
      metadata.image = null;
    }
  }

  return metadata;
}

// Helper: Clean HTML content
function cleanContent(html) {
  if (!html) return '';

  // Rimuovi script e style tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Rimuovi attributi inline style
  cleaned = cleaned.replace(/\s*style="[^"]*"/gi, '');

  // Rimuovi classi eccetto alcune utili
  cleaned = cleaned.replace(/\s*class="[^"]*"/gi, '');

  return cleaned;
}

// Helper: Estrai immagini da HTML
function extractImages(html, baseUrl) {
  if (!html) return [];

  const imgRegex = /<img[^>]+src="([^">]+)"/gi;
  const images = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    let imgUrl = match[1];
    
    // Converti URL relative in assolute
    if (!imgUrl.startsWith('http')) {
      try {
        imgUrl = new URL(imgUrl, baseUrl).href;
      } catch (e) {
        continue;
      }
    }

    // Filtra immagini troppo piccole (probabilmente icone/ads)
    if (!imgUrl.includes('1x1') && !imgUrl.includes('pixel')) {
      images.push(imgUrl);
    }
  }

  return images;
}

// Helper: Estrazione manuale fallback
function manualExtraction(document, metadata) {
  // Cerca selettori comuni per articoli
  const selectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '#content',
    'main'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const textContent = element.textContent || '';
      if (textContent.length > 200) {
        return {
          title: metadata.title || document.querySelector('h1')?.textContent || 'Untitled',
          content: element.innerHTML,
          textContent: textContent,
          excerpt: textContent.substring(0, 200) + '...',
          length: textContent.length
        };
      }
    }
  }

  return null;
}

// Helper: Estrai domain da URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return 'Unknown';
  }
}

// Cleanup vecchie cache ogni ora
setInterval(() => {
  const now = Date.now();
  for (const [url, cached] of articleCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      articleCache.delete(url);
    }
  }
  console.log(`🧹 Cache cleanup: ${articleCache.size} articoli in cache`);
}, 60 * 60 * 1000); // 1 ora