import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ReleasesPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">🎵 Nuove Release</h1>
        <p className="text-gray-400 mb-8">
          Tutte le ultime uscite dei tuoi artisti
        </p>

        {/* Griglia Release (placeholder) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="aspect-square bg-gray-700 rounded mb-3 flex items-center justify-center">
                <span className="text-4xl">🎵</span>
              </div>
              <h3 className="font-bold text-sm mb-1">Titolo Release</h3>
              <p className="text-gray-400 text-xs">Nome Artista</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}