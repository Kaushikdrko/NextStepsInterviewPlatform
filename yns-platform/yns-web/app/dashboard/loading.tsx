function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-gray-100 bg-white shadow-card ${className}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="h-16 border-b border-gray-100 bg-white" />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-gray-200" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <SkeletonCard className="h-[520px] lg:col-span-3" />
          <div className="space-y-6 lg:col-span-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-80" />
          </div>
          <SkeletonCard className="h-[520px] lg:col-span-3" />
        </div>
      </main>
    </div>
  );
}
