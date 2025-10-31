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
        
        // Timeout di 35 secondi (più lungo del backend per sicurezza)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        
        const response = await fetch(`/api/news/parse-article?url=${encodedUrl}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Unable to parse article (invalid response format)');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to parse article');
        }

        setArticle(data.article);
      } catch (err) {
        console.error('Error fetching article:', err);
        
        if (err.name === 'AbortError') {
          setError('Article loading timeout - opening in new tab...');
        } else {
          setError(err.message || 'Unable to load article');
        }
        
        // Apri direttamente il link esterno dopo 1 secondo
        setTimeout(() => {
          window.open(articleUrl, '_blank');
          onClose();
        }, 1000);
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

  // Extract domain for URL bar
  const extractDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

  if (!articleUrl) return null;

  return (
    <div className="article-modal-overlay" onClick={onClose}>
      <div className="article-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header - Browser Style */}
        <div className="browser-header">
          <button 
            onClick={onClose} 
            className="back-button"
            aria-label="Close article"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* URL Bar (fake but looks real) */}
          <div className="url-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="lock-icon">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="url-text">
              {article ? extractDomain(articleUrl) : articleUrl ? extractDomain(articleUrl) : 'Loading...'}
            </span>
          </div>

          {/* Open External Button */}
          <a 
            href={articleUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-button"
            title="Open in browser"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Content */}
        <div className="article-modal-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading article...</p>
              <p className="loading-hint">This may take up to 30 seconds for long articles</p>
              
              {/* Skeleton preview mentre carica */}
              <div className="skeleton-preview">
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-subtitle"></div>
                <div className="skeleton-image"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">⚠️ {error}</p>
              <p className="error-hint">Opening article in new tab...</p>
              <a 
                href={articleUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="error-link"
                onClick={onClose}
              >
                Click here if not redirected automatically
              </a>
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
                <div className="footer-disclaimer">
                  <p className="copyright-notice">
                    Content © {article.siteName || 'Original Publisher'} • Displayed for personal reading only
                  </p>
                </div>
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
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

        /* Browser-style Header */
        .browser-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: white;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .back-button:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #111827;
        }

        /* URL Bar (looks like real browser) */
        .url-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          min-width: 0;
        }

        .lock-icon {
          color: #10b981;
          flex-shrink: 0;
        }

        .url-text {
          font-size: 14px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
        }

        .external-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: white;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          text-decoration: none;
        }

        .external-button:hover {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: white;
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

        .loading-hint {
          font-size: 12px !important;
          color: #9ca3af !important;
          font-style: italic;
          margin-top: 8px;
        }

        /* Skeleton Preview */
        .skeleton-preview {
          width: 100%;
          max-width: 600px;
          margin-top: 40px;
          padding: 20px;
        }

        .skeleton-line {
          height: 16px;
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 12px;
        }

        .skeleton-line.skeleton-title {
          height: 32px;
          width: 80%;
          margin-bottom: 16px;
        }

        .skeleton-line.skeleton-subtitle {
          height: 20px;
          width: 60%;
          margin-bottom: 24px;
        }

        .skeleton-line.short {
          width: 70%;
        }

        .skeleton-image {
          height: 200px;
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
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
          margin-bottom: 16px;
        }

        .error-link {
          display: inline-block;
          color: #8b5cf6;
          font-size: 14px;
          font-weight: 500;
          text-decoration: underline;
          cursor: pointer;
        }

        .error-link:hover {
          color: #7c3aed;
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

        .footer-disclaimer {
          margin-bottom: 16px;
        }

        .copyright-notice {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
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

          .browser-header {
            padding: 10px 12px;
          }

          .back-button,
          .external-button {
            width: 32px;
            height: 32px;
          }

          .url-bar {
            padding: 6px 10px;
          }

          .url-text {
            font-size: 13px;
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