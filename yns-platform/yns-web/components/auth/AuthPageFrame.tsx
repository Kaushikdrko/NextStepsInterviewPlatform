import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrainCircuit, CheckCircle2 } from 'lucide-react';

interface AuthPageFrameProps {
  children: ReactNode;
}

const highlights = [
  'AI-powered mock interviews tailored to your profile',
  'Personalized feedback to improve every answer',
  'Practice for college, internship, or career interviews',
];

export function AuthPageFrame({ children }: AuthPageFrameProps) {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen overflow-hidden rounded-none border border-slate-200 bg-slate-100 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-indigo-700 px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-white/10" />

          <Link href="/" className="relative z-10 flex items-center gap-3 text-xl font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <BrainCircuit className="h-6 w-6" aria-hidden="true" />
            </span>
            InterviewPrep AI
          </Link>

          <div className="relative z-10 my-auto max-w-lg space-y-8">
            <div className="space-y-5">
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                Ace your next interview with AI
              </h1>
              <p className="max-w-lg text-xl leading-8 text-indigo-100">
                Practice smarter, get personalized feedback, and walk in confident.
              </p>
            </div>

            <div className="space-y-4 text-base font-medium text-indigo-50">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-100" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-sm font-semibold text-indigo-200">
            Built for students, graduates & professionals.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          {children}
        </section>
      </div>
    </main>
  );
}
