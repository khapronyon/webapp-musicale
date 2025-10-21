export default function Header() {
  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-purple-500">
          MusicHub
        </div>
        <div className="flex gap-4">
          <button className="hover:text-purple-400 relative">
            🔔
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>
          <button className="hover:text-purple-400">
            👤
          </button>
        </div>
      </div>
    </header>
  );
}