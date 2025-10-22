'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    marketingConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            nickname: formData.nickname,
            marketing_consent: formData.marketingConsent,
          }
        ]);

      if (profileError) throw profileError;

      alert('Registrazione completata! Controlla la tua email per confermare.');
      router.push('/auth/login');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-500 mb-2">MusicHub</h1>
          <h2 className="text-xl text-white">Crea il tuo account</h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
              placeholder="tua@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Nickname</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={20}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
              placeholder="Il tuo nickname"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
              placeholder="Minimo 6 caratteri"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              name="marketingConsent"
              checked={formData.marketingConsent}
              onChange={handleChange}
              className="mt-1"
            />
            <label className="text-gray-400 text-sm">
              Acconsento a ricevere comunicazioni marketing (opzionale)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 rounded transition-colors"
          >
            {loading ? 'Registrazione...' : 'Registrati'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Hai già un account?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-purple-400 hover:text-purple-300"
            >
              Accedi
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}