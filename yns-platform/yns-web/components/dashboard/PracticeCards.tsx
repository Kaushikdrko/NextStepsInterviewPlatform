import Link from 'next/link';
import { BriefcaseBusiness, Code2, FileText, Mic, UsersRound } from 'lucide-react';

const practiceModes = [
  {
    title: 'Behavioral Interview',
    description: 'Practice common behavioral questions about teamwork, leadership, and problem-solving.',
    href: '/practice/session?mode=behavioral',
    icon: UsersRound,
    iconClassName: 'bg-blue-50 text-blue-500',
  },
  {
    title: 'Technical Interview',
    description: 'Sharpen your technical knowledge with role-specific questions and scenarios.',
    href: '/practice/session?mode=technical',
    icon: Code2,
    iconClassName: 'bg-purple-50 text-purple-500',
  },
  {
    title: 'Resume-Based Questions',
    description: 'Get asked questions tailored to the experience on your resume.',
    href: '/practice/session?mode=resume',
    icon: FileText,
    iconClassName: 'bg-amber-50 text-amber-500',
  },
  {
    title: 'Job Posting Interview',
    description: 'Simulate an interview based on a specific job description and company.',
    href: '/practice/session?mode=job_posting',
    icon: BriefcaseBusiness,
    iconClassName: 'bg-emerald-50 text-emerald-500',
  },
  {
    title: 'General Mock Interview',
    description: 'A full mixed mock interview covering both behavioral and technical topics.',
    href: '/practice/session?mode=general',
    icon: Mic,
    iconClassName: 'bg-rose-50 text-rose-500',
  },
];

export function PracticeCards() {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-950">Practice Modes</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {practiceModes.map((mode) => (
          <article key={mode.title} className="flex min-h-[218px] flex-col rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${mode.iconClassName}`}>
              <mode.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="mt-4 flex flex-1 flex-col">
              <h3 className="text-sm font-bold leading-tight text-slate-950 sm:text-base">{mode.title}</h3>
              <p className="mt-2 flex-1 text-sm font-semibold leading-5 text-slate-500">{mode.description}</p>
              <Link
                href={mode.href}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700"
              >
                Start Practice
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
