import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ConcertsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">🎤 Concerti</h1>
        <p className="text-gray-400 mb-8">
          Eventi live dei tuoi artisti preferiti
        </p>

        {/* Lista Concerti (placeholder) */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">Nome Artista - Tour 2025</h3>
                  <p className="text-gray-400 mb-1">📍 Milano, Mediolanum Forum</p>
                  <p className="text-gray-400 mb-3">📅 15 Dicembre 2025 • 21:00</p>
                  <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-bold transition-colors">
                    Acquista Biglietti
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 text-sm">da</span>
                  <p className="text-2xl font-bold text-purple-400">€45</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}