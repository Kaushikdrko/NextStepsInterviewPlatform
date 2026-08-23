export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 hidden w-[220px] border-r border-slate-200 bg-white lg:block">
        <div className="h-16 border-b border-slate-200" />
      </div>

      <div className="min-h-screen px-4 py-6 sm:px-6 lg:pl-[220px]">
        <div className="app-page-container space-y-5 lg:px-6">
          <div className="h-[160px] animate-pulse rounded-[14px] bg-indigo-200" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[116px] animate-pulse rounded-[10px] bg-white" />
            ))}
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="h-[360px] animate-pulse rounded-[10px] bg-white" />
              <div className="h-[360px] animate-pulse rounded-[10px] bg-white" />
            </div>
            <div className="h-[170px] animate-pulse rounded-[10px] bg-white" />
          </div>
        </div>
      </div>
    </main>
  );
}
