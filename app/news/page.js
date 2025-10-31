'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ArticleModal from '@/app/components/ArticleModal';

export default function NewsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
    };
    getCurrentUser();
  }, [router]);

  // Fetch news articles
  useEffect(() => {
    if (!user) return;

    const fetchNews = async () => {
      try {
        setLoading(true);

        // Chiamata alla nuova API RSS feed
        const response = await fetch(`/api/news/rss-feed?userId=${user.id}`);
        const data = await response.json();

        if (data.success) {
          setArticles(data.articles);
          console.log(`📰 Loaded ${data.articles.length} news articles`);
        } else {
          console.error('Failed to fetch news:', data.error);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [user]);

  // Get unique sources for filter
  const sources = ['all', ...new Set(articles.map(a => a.source))];

  // Filter articles by source
  const filteredArticles = selectedSource === 'all' 
    ? articles 
    : articles.filter(a => a.source === selectedSource);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Handle article click
  const handleArticleClick = (article) => {
    setSelectedArticle(article.link);
  };

  if (!user) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">🗞️ Music News</h1>
          <p className="page-subtitle">
            Latest articles from top music publications
          </p>
        </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-group">
          <label>Source:</label>
          <select 
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="filter-select"
          >
            {sources.map(source => (
              <option key={source} value={source}>
                {source === 'all' ? 'All Sources' : source}
              </option>
            ))}
          </select>
        </div>

        <div className="articles-count">
          {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading latest news...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredArticles.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <h3>No articles found</h3>
          <p>
            {selectedSource === 'all' 
              ? "We couldn't find any recent articles. Try again later!" 
              : `No articles from ${selectedSource}. Try selecting a different source.`
            }
          </p>
        </div>
      )}

      {/* News Grid */}
      {!loading && filteredArticles.length > 0 && (
        <div className="news-grid">
          {filteredArticles.map((article, index) => (
            <div 
              key={`${article.link}-${index}`} 
              className="news-card"
              onClick={() => handleArticleClick(article)}
            >
              {/* Image */}
              {article.image && (
                <div className="news-image-container">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="news-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="news-content">
                {/* Source Badge */}
                <div className="news-source-badge">
                  {article.sourceLogo && (
                    <img 
                      src={article.sourceLogo} 
                      alt={article.source}
                      className="source-logo"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <span>{article.source}</span>
                </div>

                {/* Title */}
                <h3 className="news-title">{article.title}</h3>

                {/* Description */}
                {article.description && (
                  <p className="news-description">
                    {article.description.length > 150 
                      ? article.description.substring(0, 150) + '...' 
                      : article.description
                    }
                  </p>
                )}

                {/* Footer */}
                <div className="news-footer">
                  <span className="news-date">{formatDate(article.pubDate)}</span>
                  {article.matchedArtist && (
                    <span className="matched-artist-badge">
                      🎵 {article.matchedArtist}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal 
          articleUrl={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      <style jsx>{`
        .page-container {
          min-height: calc(100vh - 60px - 70px); /* viewport - header - footer */
          background: #f5f5f5; /* bg-neutral-light */
          padding: 20px;
          padding-bottom: 40px;
        }

        .page-header {
          max-width: 1200px;
          margin: 0 auto 32px;
          text-align: center;
        }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937; /* text-neutral-dark */
          margin-bottom: 8px;
        }

        .page-subtitle {
          font-size: 16px;
          color: #6b7280; /* text-gray-600 */
        }

        /* Filters */
        .filters-container {
          max-width: 1200px;
          margin: 0 auto 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-group label {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }

        .filter-select {
          padding: 8px 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          color: #1f2937;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover {
          border-color: #8b5cf6;
        }

        .filter-select:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .filter-select option {
          background: white;
          color: #1f2937;
        }

        .articles-count {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        /* Loading State */
        .loading-state {
          max-width: 1200px;
          margin: 60px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          color: #6b7280;
          font-size: 14px;
        }

        /* Empty State */
        .empty-state {
          max-width: 500px;
          margin: 60px auto;
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.6;
        }

        /* News Grid */
        .news-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        /* News Card */
        .news-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 2px solid transparent;
        }

        .news-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          border-color: #8b5cf6;
        }

        .news-image-container {
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
        }

        .news-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .news-card:hover .news-image {
          transform: scale(1.05);
        }

        .news-content {
          padding: 20px;
        }

        .news-source-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .source-logo {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        .news-source-badge span {
          font-size: 12px;
          font-weight: 600;
          color: #8b5cf6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .news-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937; /* text-neutral-dark */
          line-height: 1.4;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .news-description {
          font-size: 14px;
          color: #6b7280; /* text-gray-600 */
          line-height: 1.6;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .news-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .news-date {
          font-size: 12px;
          color: #6b7280;
        }

        .matched-artist-badge {
          font-size: 11px;
          padding: 4px 8px;
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
          border-radius: 6px;
          font-weight: 500;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-container {
            padding: 16px;
            padding-bottom: 40px;
          }

          .page-title {
            font-size: 24px;
          }

          .filters-container {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            width: 100%;
          }

          .filter-select {
            flex: 1;
          }

          .news-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .news-image-container {
            height: 180px;
          }
        }
      `}</style>
    </div>
    <Footer />
    </>
  );
}