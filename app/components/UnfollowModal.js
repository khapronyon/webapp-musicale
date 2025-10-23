'use client';

import { X } from 'lucide-react';

export default function UnfollowModal({ artist, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-slide-in">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="text-5xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-neutral-dark mb-2">
            Smettere di seguire?
          </h2>
          <p className="text-gray-600 mb-6">
            Non riceverai più notifiche per le nuove release di{' '}
            <span className="font-bold text-primary">{artist?.name || artist?.artist_name}</span>
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-neutral-dark rounded-lg font-medium transition"
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
            >
              Sì, smetti di seguire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}