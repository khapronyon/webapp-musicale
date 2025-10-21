import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">
          Benvenuto nella tua Webapp Musicale! 🎵
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Il tuo hub personalizzato per seguire i tuoi artisti preferiti.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-2">🎵 Release</h3>
            <p className="text-gray-400">Nuove uscite dei tuoi artisti</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-2">📰 News</h3>
            <p className="text-gray-400">Ultime notizie musicali</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-2">🎤 Concerti</h3>
            <p className="text-gray-400">Eventi live in arrivo</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}