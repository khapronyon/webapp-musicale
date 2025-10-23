'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ExternalLink, Calendar, Filter } from 'lucide-react';

const CACHE_KEY = 'news_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minuti

export default function NewsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerTarget = useRef(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    loadNews(true);
  }, [category]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
  }

  function getCacheKey() {
    return `${CACHE_KEY}_${category}`;
  }

  function loadFromCache() {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        console.log('✅ News cache hit!');
        return data;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  function saveToCache(data) {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  async function loadNews(resetPage = false) {
    try {
      if (resetPage) {
        setPage(1);
        setArticles([]);
        setLoading(true);
      }

      // Prova cache
      const cached = loadFromCache();
      if (cached && resetPage) {
        setArticles(cached);
        setLoading(false);
        return;
      }

      // Fetch da API
      const currentPage = resetPage ? 1 : page;
      const response = await fetch(`/api/news?category=${category}&page=${currentPage}&pageSize=20`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const newArticles = resetPage ? data.articles : [...articles, ...data.articles];
      setArticles(newArticles);
      setHasMore(newArticles.length < data.totalResults);

      if (resetPage) {
        saveToCache(data.articles);
      }

    } catch (error) {
      console.error('Error loading news:', error);
      alert('Errore caricamento news. Riprova.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      const response = await fetch(`/api/news?category=${category}&page=${nextPage}&pageSize=20`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setArticles(prev => [...prev, ...data.articles]);
      setHasMore(articles.length + data.articles.length < data.totalResults);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleCategoryChange(newCategory) {
    setCategory(newCategory);
  }

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📰</div>
          <p className="text-gray-600">Caricamento news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">News Musicali</h1>
        <p className="text-gray-600 mb-8">Le ultime notizie dal mondo della musica</p>

        {/* Category Filters */}
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 overflow-x-auto">
          <Filter size={18} className="text-gray-500 flex-shrink-0" />
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Tutte', icon: '🎵' },
              { id: 'releases', label: 'Uscite', icon: '💿' },
              { id: 'concerts', label: 'Concerti', icon: '🎤' },
              { id: 'industry', label: 'Industria', icon: '💼' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${
                  category === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-white text-neutral-dark hover:bg-primary-light hover:bg-opacity-20 border-2 border-primary-light'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-6xl mb-4">📰</p>
            <h2 className="text-xl font-bold text-neutral-dark mb-2">
              Nessuna news disponibile
            </h2>
            <p className="text-gray-600">
              Prova a cambiare categoria
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article, index) => (
              <a
                key={`${article.id}-${index}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="md:w-1/3 aspect-video md:aspect-auto md:min-h-[250px] overflow-hidden bg-gray-200">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/800x450/667eea/ffffff?text=News';
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 md:p-6">
                    {/* Source & Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span className="font-medium text-primary">{article.source}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg md:text-xl font-bold text-neutral-dark mb-2 line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm md:text-base mb-4 line-clamp-3">
                      {article.description}
                    </p>

                    {/* Author */}
                    {article.author && (
                      <p className="text-xs text-gray-500 mb-3">
                        {article.author}
                      </p>
                    )}

                    {/* Read More Link */}
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      Leggi articolo completo
                      <ExternalLink size={16} />
                    </div>
                  </div>
                </div>
              </a>
            ))}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2 animate-bounce">📰</div>
                <p className="text-gray-600">Caricamento altre news...</p>
              </div>
            )}

            {/* Infinite Scroll Target */}
            {hasMore && <div ref={observerTarget} className="h-20"></div>}

            {/* No More Articles */}
            {!hasMore && articles.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Hai visualizzato tutte le news disponibili
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}