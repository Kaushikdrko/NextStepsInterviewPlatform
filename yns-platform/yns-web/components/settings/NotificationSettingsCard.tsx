import { Bell, Target } from 'lucide-react';

export function NotificationSettingsCard() {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[#e7dbd0] bg-white shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
      <div className="flex items-center gap-3 border-b border-[#eee5de] px-5 py-5 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff2ed] text-[#ad2d1f]">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-[#271f1b]">Notifications</h2>
          <p className="mt-1 text-xs font-medium text-[#8a7c75]">
            Email reminders will be available in a future update.
          </p>
        </div>
        <span className="ml-auto rounded-full bg-[#f7f1ec] px-3 py-1 text-[11px] font-extrabold text-[#8a7c75]">
          Coming soon
        </span>
      </div>

      <div className="flex flex-1 items-start">
        <NotificationOption
          icon={Target}
          title="Weekly-goal reminders"
          description="Get a reminder when your weekly practice goal still has sessions remaining."
        />
      </div>
    </section>
  );
}

function NotificationOption({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Target;
  title: string;
  description: string;
}) {
  return (
    <div className="flex w-full items-start gap-4 px-5 py-5 sm:px-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7f3] text-[#ad2d1f]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-extrabold text-[#271f1b]">{title}</h3>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            aria-label={title}
            disabled
            className="relative h-6 w-11 shrink-0 cursor-not-allowed rounded-full bg-[#d9cec6] opacity-60"
          >
            <span className="absolute top-1 h-4 w-4 translate-x-1 rounded-full bg-white shadow-sm" />
          </button>
        </div>
        <p className="mt-1.5 text-xs font-medium leading-5 text-[#8a7c75]">{description}</p>
      </div>
    </div>
  );
}
