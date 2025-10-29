'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, filter]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }
    setUser(session.user);
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          limit: 100,
          unreadOnly: filter === 'unread'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          userId: user.id
        })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      if (notification.link.startsWith('http')) {
        window.open(notification.link, '_blank');
      } else {
        router.push(notification.link);
      }
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins} minuti fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center text-gray-400">Caricamento notifiche...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Notifiche</h1>
          <p className="text-gray-400">
            {unreadCount > 0 
              ? `Hai ${unreadCount} notifica${unreadCount === 1 ? '' : 'e'} non letta${unreadCount === 1 ? '' : 'e'}`
              : 'Tutte le notifiche sono state lette'
            }
          </p>
        </div>

        {/* Filtri e Azioni */}
        <div className="flex items-center justify-between mb-6">
          {/* Filtri */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Tutte ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Non lette ({unreadCount})
            </button>
          </div>

          {/* Azione Segna tutte come lette */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Segna tutte come lette
            </button>
          )}
        </div>

        {/* Lista Notifiche */}
        {notifications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
              />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'unread' ? 'Nessuna notifica non letta' : 'Nessuna notifica'}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'unread' 
                ? 'Tutte le tue notifiche sono state lette'
                : 'Ti avviseremo quando i tuoi artisti pubblicano nuova musica'
              }
            </p>
            {filter === 'unread' && notifications.length === 0 && (
              <button
                onClick={() => setFilter('all')}
                className="text-purple-400 hover:text-purple-300"
              >
                Vedi tutte le notifiche →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-750 ${
                  !notification.read ? 'border-l-4 border-purple-600' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Immagine */}
                  {(notification.release_image || notification.artist_image) && (
                    <img
                      src={notification.release_image || notification.artist_image}
                      alt=""
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  )}

                  {/* Contenuto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      
                      {/* Badge Non letta */}
                      {!notification.read && (
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                          Nuova
                        </span>
                      )}
                    </div>

                    <p className="text-gray-400 mb-3">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        {formatDate(notification.created_at)}
                      </p>

                      {/* Bottone Elimina */}
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-2"
                        title="Elimina notifica"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}