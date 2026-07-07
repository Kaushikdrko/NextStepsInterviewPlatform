import Link from 'next/link';
import { BriefcaseBusiness, ChevronRight, Code2, FileText, Sparkles, UsersRound } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';

const practiceModes = [
  {
    title: 'Behavioral Interview',
    description: 'Practice common behavioral questions about your experiences and teamwork.',
    href: '/practice/session?mode=behavioral',
    icon: UsersRound,
  },
  {
    title: 'Technical Interview',
    description: 'Sharpen your technical knowledge and problem-solving explanations.',
    href: '/practice/session?mode=technical',
    icon: Code2,
  },
  {
    title: 'Resume-Based Questions',
    description: 'Get quizzed on the projects and roles from your resume.',
    href: '/practice/session?mode=resume',
    icon: FileText,
  },
  {
    title: 'Job Posting Interview',
    description: 'Tailored questions based on a specific job description.',
    href: '/practice/session?mode=job_posting',
    icon: BriefcaseBusiness,
  },
  {
    title: 'General Mock Interview',
    description: 'A balanced mix of behavioral and technical questions.',
    href: '/practice/session?mode=general',
    icon: Sparkles,
  },
];

export default function PracticePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="flex min-h-screen items-center px-4 py-8 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-3xl space-y-7">
          <header className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
              <Link href="/dashboard" className="transition hover:text-slate-950">
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="text-slate-950">Practice</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Choose a Practice Mode</h1>
              <p className="text-base font-semibold text-slate-500">Select the type of interview you&apos;d like to practice today.</p>
            </div>
          </header>

          <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {practiceModes.map((mode) => (
              <PracticeModeCard key={mode.title} {...mode} />
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

type PracticeModeCardProps = (typeof practiceModes)[number];

function PracticeModeCard({ title, description, href, icon: Icon }: PracticeModeCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-[104px] w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition',
        'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'sm:p-5',
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block text-lg font-extrabold leading-tight text-slate-950">{title}</span>
        <span className="block max-w-md text-sm font-semibold leading-6 text-slate-500">{description}</span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" aria-hidden="true" />
    </Link>
  );
}
