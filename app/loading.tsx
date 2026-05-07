export default function Loading() {
  return (
    <main className="min-h-screen p-8 bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header / Current Conditions Skeleton */}
        <div className="h-48 w-full rounded-2xl skeleton-glass"></div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Radar/Map Skeleton (Spans 2 columns) */}
          <div className="h-96 md:col-span-2 rounded-2xl skeleton-glass"></div>

          {/* Hourly Forecast Stack Skeleton */}
          <div className="space-y-4">
            <div className="h-28 w-full rounded-2xl skeleton-glass"></div>
            <div className="h-28 w-full rounded-2xl skeleton-glass"></div>
            <div className="h-28 w-full rounded-2xl skeleton-glass"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
