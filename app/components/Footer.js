export default function Footer() {
  const sections = [
    { icon: "🛍️", label: "Merch" },
    { icon: "🎤", label: "Concerti" },
    { icon: "⭐", label: "Artisti", featured: true },
    { icon: "🎵", label: "Release" },
    { icon: "📰", label: "News" },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          {sections.map((section) => (
            <button
              key={section.label}
              className={`flex flex-col items-center gap-1 hover:text-purple-400 transition-all ${
                section.featured ? "scale-125" : ""
              }`}
            >
              <span className="text-2xl">{section.icon}</span>
              <span className={`text-xs ${section.featured ? "font-bold" : ""}`}>
                {section.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}