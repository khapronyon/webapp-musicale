import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MerchPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-bold mb-4">🛍️ Merchandising</h1>
        <p className="text-gray-400 mb-8">
          Shop ufficiale dei tuoi artisti preferiti
        </p>

        {/* Griglia Merch (placeholder) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-purple-500 transition-colors cursor-pointer">
              <div className="aspect-square bg-gray-700 flex items-center justify-center">
                <span className="text-5xl">👕</span>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm mb-1">Prodotto Merch</h3>
                <p className="text-purple-400 font-bold">€29.99</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}