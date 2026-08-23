type DashboardHeaderProps = {
  targetRole: string | null;
};

export function DashboardHeader({ targetRole }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-black tracking-normal text-[#271f1b]">Dashboard</h1>
      <div className="inline-flex max-w-full self-start items-center rounded-full border border-[#e3d4c7] bg-white px-4 py-2 text-xs font-medium text-[#8a7c75] shadow-sm sm:self-auto">
        <span>Target role</span>
        <span className="mx-1.5 text-[#c4b5aa]">·</span>
        <span className="min-w-0 max-w-[230px] truncate font-extrabold text-[#71645e]">{targetRole ?? 'Not set'}</span>
      </div>
    </header>
  );
}
