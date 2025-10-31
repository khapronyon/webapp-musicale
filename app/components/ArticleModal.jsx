'use client';

import { useEffect, useState } from 'react';

export default function ArticleModal({ articleUrl, onClose }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!articleUrl) return;

    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);

        const encodedUrl = encodeURIComponent(articleUrl);
        const response = await fetch(`/api/news/parse-article?url=${encodedUrl}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to parse article');
        }

        setArticle(data.article);
      } catch (err) {
        console.error('Error fetching article:', err);
        setError(err.message);
        
        // Se fallisce, apri direttamente il link esterno
        setTimeout(() => {
          window.open(articleUrl, '_blank');
          onClose();
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleUrl]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!articleUrl) return null;

  return (
    <div className="article-modal-overlay" onClick={onClose}>
      <div className="article-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="article-modal-header">
          <button 
            onClick={onClose} 
            className="back-button"
            aria-label="Close article"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back to News</span>
          </button>

          {article && (
            <a 
              href={articleUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link-button"
            >
              <span>Read Original</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>

        {/* Content */}
        <div className="article-modal-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading article...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">⚠️ {error}</p>
              <p className="error-hint">Opening original article in new tab...</p>
            </div>
          )}

          {article && !loading && !error && (
            <article className="article-reader">
              {/* Featured Image */}
              {article.featuredImage && (
                <div className="article-image-container">
                  <img 
                    src={article.featuredImage} 
                    alt={article.title}
                    className="article-featured-image"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}

              {/* Article Header */}
              <header className="article-header">
                <h1 className="article-title">{article.title}</h1>
                
                <div className="article-meta">
                  {article.siteName && (
                    <span className="article-source">{article.siteName}</span>
                  )}
                  {article.byline && (
                    <span className="article-author">by {article.byline}</span>
                  )}
                  {article.readingTime && (
                    <span className="article-reading-time">
                      {article.readingTime} min read
                    </span>
                  )}
                </div>

                {article.excerpt && (
                  <p className="article-excerpt">{article.excerpt}</p>
                )}
              </header>

              {/* Article Body */}
              <div 
                className="article-body"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Footer */}
              <footer className="article-footer">
                <a 
                  href={articleUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="original-link"
                >
                  Read full article on {article.siteName || 'original site'} →
                </a>
              </footer>
            </article>
          )}
        </div>
      </div>

      <style jsx>{`
        .article-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .article-modal-container {
          background: white;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .article-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          flex-shrink: 0;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .external-link-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .external-link-button:hover {
          background: #7c3aed;
        }

        .article-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
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

        /* Error State */
        .error-state {
          text-align: center;
          padding: 60px 20px;
        }

        .error-message {
          color: #dc2626;
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .error-hint {
          color: #6b7280;
          font-size: 14px;
        }

        /* Article Reader */
        .article-reader {
          max-width: 680px;
          margin: 0 auto;
        }

        .article-image-container {
          margin-bottom: 32px;
          border-radius: 8px;
          overflow: hidden;
        }

        .article-featured-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .article-header {
          margin-bottom: 32px;
        }

        .article-title {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
          color: #111827;
          margin-bottom: 16px;
        }

        .article-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .article-meta span {
          display: flex;
          align-items: center;
        }

        .article-meta span:not(:last-child)::after {
          content: '•';
          margin-left: 12px;
        }

        .article-excerpt {
          font-size: 18px;
          line-height: 1.6;
          color: #4b5563;
          font-style: italic;
        }

        /* Article Body */
        .article-body {
          font-size: 18px;
          line-height: 1.8;
          color: #374151;
        }

        .article-body :global(p) {
          margin-bottom: 20px;
        }

        .article-body :global(h2) {
          font-size: 24px;
          font-weight: 600;
          margin-top: 32px;
          margin-bottom: 16px;
          color: #111827;
        }

        .article-body :global(h3) {
          font-size: 20px;
          font-weight: 600;
          margin-top: 24px;
          margin-bottom: 12px;
          color: #111827;
        }

        .article-body :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 24px 0;
        }

        .article-body :global(ul),
        .article-body :global(ol) {
          margin-bottom: 20px;
          padding-left: 24px;
        }

        .article-body :global(li) {
          margin-bottom: 8px;
        }

        .article-body :global(blockquote) {
          border-left: 4px solid #8b5cf6;
          padding-left: 20px;
          margin: 24px 0;
          font-style: italic;
          color: #4b5563;
        }

        .article-body :global(a) {
          color: #8b5cf6;
          text-decoration: underline;
        }

        .article-body :global(a:hover) {
          color: #7c3aed;
        }

        /* Footer */
        .article-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .original-link {
          display: inline-block;
          color: #8b5cf6;
          font-size: 16px;
          font-weight: 500;
          text-decoration: none;
          padding: 12px 24px;
          border: 2px solid #8b5cf6;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .original-link:hover {
          background: #8b5cf6;
          color: white;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .article-modal-overlay {
            padding: 0;
          }

          .article-modal-container {
            max-width: 100%;
            max-height: 100vh;
            border-radius: 0;
          }

          .article-modal-content {
            padding: 20px;
          }

          .article-title {
            font-size: 24px;
          }

          .article-body {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}