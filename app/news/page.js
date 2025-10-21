import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">📰 News Musicali</h1>
        <p className="text-gray-400 mb-8">
          Le ultime notizie sui tuoi artisti preferiti
        </p>

        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors cursor-pointer">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                  <span className="text-3xl">📰</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-2">Titolo Articolo Interessante</h3>
                  <p className="text-gray-400 text-sm mb-2">
                    Breve descrizione articolo che cattura attenzione del lettore...
                  </p>
                  <p className="text-gray-500 text-xs">Fonte • 2 ore fa</p>
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