// Componenti skeleton per loading states

export function ArtistCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
      <div className="w-full aspect-square bg-gray-200 rounded-lg mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export function ReleaseCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200"></div>
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  );
}

export function TrackListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
      ))}
    </div>
  );
}

export function AlbumGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="relative h-64 bg-gradient-to-b from-gray-300 to-gray-200 animate-pulse">
      <div className="absolute bottom-6 left-6 flex items-end gap-6">
        <div className="w-40 h-40 bg-gray-400 rounded-lg shadow-xl"></div>
        <div className="pb-4 space-y-2">
          <div className="h-8 bg-gray-400 rounded w-48"></div>
          <div className="h-4 bg-gray-400 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
}