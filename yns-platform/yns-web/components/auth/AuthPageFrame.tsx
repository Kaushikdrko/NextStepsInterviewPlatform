import type { ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles } from 'lucide-react';

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
    <main className="min-h-screen bg-[#fbfaf7]">
      <div className="grid min-h-screen overflow-hidden rounded-none border border-[#f8bfa9] bg-[#fbfaf7] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#a83223] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-white/12" />
          <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-white/12" />

          <Link href="/" className="relative z-10 flex items-center gap-3 text-xl font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white text-white">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col text-xl font-extrabold leading-[1.05] tracking-tight">
              <span>your</span>
              <span>next steps</span>
            </span>
          </Link>

          <div className="relative z-10 my-auto max-w-lg space-y-8">
            <div className="space-y-5">
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                Ace your next interview with AI
              </h1>
              <p className="max-w-lg text-xl leading-8 text-[#f4c7bd]">
                Practice smarter, get personalized feedback, and walk in confident.
              </p>
            </div>

            <div className="space-y-4 text-base font-medium text-[#fff4ef]">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#ffe1d6]" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-sm font-semibold text-[#dca296]">
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
