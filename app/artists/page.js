import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ArtistsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">⭐ I Tuoi Artisti</h1>
        <p className="text-gray-400 mb-8">
          Cerca e segui i tuoi artisti preferiti
        </p>

        {/* Barra di Ricerca */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="🔍 Cerca artisti..."
            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Lista Artisti (placeholder) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            Nessun artista seguito ancora. <br />
            Usa la barra di ricerca per trovare i tuoi preferiti!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}