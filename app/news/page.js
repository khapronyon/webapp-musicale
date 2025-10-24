'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ExternalLink, Calendar, Heart, Bookmark, Share2 } from 'lucide-react';

export default function NewsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerTarget = useRef(null);

  useEffect(() => {
    checkUser();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && user) {
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
  }, [hasMore, loadingMore, user]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
    loadNews(user);
  }

  async function loadNews(currentUser) {
    try {
      setLoading(true);

      // Ottieni artisti seguiti da Supabase client-side
      const { data: followedArtists } = await supabase
        .from('followed_artists')
        .select('artist_name')
        .eq('user_id', currentUser.id);

      const artistNames = followedArtists?.map(a => a.artist_name) || [];
      
      console.log(`📰 Sending ${artistNames.length} artists to API:`, artistNames);

      // POST invece di GET, passa artisti nel body
      const response = await fetch(`/api/personalized-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistNames: artistNames,
          page: 1,
          pageSize: 10
        })
      });
      
      const data = await response.json();

      if (data.error) {
        console.error('Error loading news:', data.error);
        setArticles([]);
        return;
      }

      console.log(`✅ Loaded ${data.articles.length} articles`);
      console.log('📊 Response data:', data);
      
      // Debug warnings
      if (data.mock) {
        console.warn('⚠️⚠️⚠️ SHOWING MOCK DATA - Not real articles ⚠️⚠️⚠️');
      }
      if (!data.followedArtistsCount || data.followedArtistsCount === 0) {
        console.warn('⚠️⚠️⚠️ You are following 0 artists! ⚠️⚠️⚠️');
      }
      if (data.followedArtistsCount > 0 && data.mock) {
        console.warn('⚠️⚠️⚠️ Following artists but still showing mock! Check API logs ⚠️⚠️⚠️');
      }
      
      setArticles(data.articles || []);
      setHasMore(data.articles.length >= 10);

    } catch (error) {
      console.error('Error loading news:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore || !user) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      // Ottieni artisti
      const { data: followedArtists } = await supabase
        .from('followed_artists')
        .select('artist_name')
        .eq('user_id', user.id);

      const artistNames = followedArtists?.map(a => a.artist_name) || [];

      const response = await fetch(`/api/personalized-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistNames: artistNames,
          page: nextPage,
          pageSize: 10
        })
      });
      
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const newArticles = data.articles || [];
      setArticles(prev => [...prev, ...newArticles]);
      setHasMore(newArticles.length >= 10);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📰</div>
          <p className="text-gray-600">Caricamento del tuo feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light pb-20">
      <Header />

      <main className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-8">
        {/* Header Feed */}
        <div className="bg-white p-4 sm:rounded-t-lg border-b border-gray-200 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-neutral-dark">Il Tuo Feed</h1>
          <p className="text-sm text-gray-600 mt-1">News personalizzate sui tuoi artisti</p>
        </div>

        {/* Feed Verticale */}
        {articles.length === 0 ? (
          <div className="text-center py-12 bg-white sm:rounded-b-lg">
            <p className="text-6xl mb-4">🎤</p>
            <h2 className="text-xl font-bold text-neutral-dark mb-2">
              Nessuna news nel tuo feed
            </h2>
            <p className="text-gray-600 mb-4">
              Segui alcuni artisti per ricevere news personalizzate!
            </p>
            <button
              onClick={() => router.push('/artists')}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition"
            >
              Cerca Artisti
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {articles.map((article, index) => {
              return (
                <React.Fragment key={`${article.id}-${index}`}>
                  <article className="bg-white border-b border-gray-200 last:sm:rounded-b-lg">
                    {/* Wrapper cliccabile per tutta la card */}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:bg-gray-50 transition"
                    >
                      {/* Source & Date */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                            {article.source.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-neutral-dark">{article.source}</p>
                            <p className="text-xs text-gray-500">
                              {(() => {
                                const date = new Date(article.publishedAt);
                                const now = new Date();
                                const diffMs = now - date;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);

                                if (diffMins < 60) return `${diffMins}m fa`;
                                if (diffHours < 24) return `${diffHours}h fa`;
                                if (diffDays < 7) return `${diffDays}g fa`;
                                return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="w-full aspect-[4/3] bg-gray-200 relative">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/800x600/667eea/ffffff?text=News';
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Title */}
                        <h2 className="text-lg font-bold text-neutral-dark mb-2 line-clamp-3">
                          {article.title}
                        </h2>

                        {/* Description */}
                        {article.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                            {article.description}
                          </p>
                        )}

                        {/* Author */}
                        {article.author && (
                          <p className="text-xs text-gray-500 mb-3">
                            {article.author}
                          </p>
                        )}

                        {/* Read More Indicator */}
                        <div className="inline-flex items-center gap-2 text-primary font-medium text-sm">
                          Leggi articolo
                          <ExternalLink size={14} />
                        </div>
                      </div>
                    </a>

                    {/* Action Buttons - Outside link */}
                    <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 text-gray-600 hover:text-primary transition"
                        >
                          <Heart size={20} />
                          <span className="text-sm font-medium">Mi piace</span>
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 text-gray-600 hover:text-primary transition"
                        >
                          <Bookmark size={20} />
                          <span className="text-sm font-medium">Salva</span>
                        </button>
                      </div>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary transition"
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </article>

                  {/* [SPAZIO PUBBLICITÁ] - Ogni 5 articoli */}
                  {(index + 1) % 5 === 0 && index !== articles.length - 1 && (
                    <div className="bg-gray-50 border-y border-gray-200 p-6 text-center">
                      <p className="text-xs text-gray-500 mb-2">PUBBLICITÀ</p>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8">
                        <p className="text-gray-400">Spazio pubblicitario {Math.floor((index + 1) / 5)}</p>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="text-center py-8 bg-white">
                <div className="text-4xl mb-2 animate-bounce">📰</div>
                <p className="text-gray-600 text-sm">Caricamento altre news...</p>
              </div>
            )}

            {/* Infinite Scroll Target */}
            {hasMore && <div ref={observerTarget} className="h-20"></div>}

            {/* End of Feed */}
            {!hasMore && articles.length > 0 && (
              <div className="text-center py-8 bg-white sm:rounded-b-lg">
                <p className="text-gray-500 text-sm">
                  Hai visualizzato tutte le news disponibili
                </p>
                <button
                  onClick={() => {
                    setPage(1);
                    setArticles([]);
                    loadNews(user);
                  }}
                  className="mt-4 px-4 py-2 text-primary hover:bg-primary-light hover:bg-opacity-10 rounded-lg transition text-sm font-medium"
                >
                  Ricarica feed
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}