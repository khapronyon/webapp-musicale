'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      router.push('/artists');
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
          <h2 className="text-xl text-white">Accedi al tuo account</h2>
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
            <label className="block text-gray-400 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
              placeholder="La tua password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 rounded transition-colors"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400">
            Non hai un account?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-purple-400 hover:text-purple-300"
            >
              Registrati
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}