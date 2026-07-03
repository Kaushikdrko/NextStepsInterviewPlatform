"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, LockKeyhole, LogIn, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { createSupabaseBrowserClient, persistSessionForServer } from '@/lib/supabase/client';
import { getPostLoginRedirect } from '@/lib/services/auth';

interface AuthFormCardProps {
  title: string;
  subtitle: string;
  mode: 'sign-in' | 'sign-up';
  footerText: string;
  footerHref: string;
  footerLinkText: string;
  submitLabel: string;
  children?: ReactNode;
}

export function AuthFormCard({
  title,
  subtitle,
  mode,
  footerText,
  footerHref,
  footerLinkText,
  submitLabel,
  children,
}: AuthFormCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const Icon = mode === 'sign-in' ? LogIn : UserPlus;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get('error');

    if (callbackError) {
      setError(callbackError);
    }
  }, []);

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    setIsGoogleSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (googleError) {
        setError(googleError.message);
        setIsGoogleSubmitting(false);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to continue with Google.');
      setIsGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === 'sign-up') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          persistSessionForServer(data.session);
          router.push('/onboarding');
          return;
        }

        setMessage('Check your email to confirm your account.');
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.session || !data.user) {
        setError('Unable to start your session. Please try again.');
        return;
      }

      persistSessionForServer(data.session);
      const { redirectTo, error: redirectError } = await getPostLoginRedirect(data.user.id, supabase);

      if (redirectError) {
        setError(redirectError);
        return;
      }

      router.push(redirectTo);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="text-lg font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-6 p-6 sm:p-7">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || isGoogleSubmitting}
            onClick={handleGoogleAuth}
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 hover:bg-slate-50"
          >
            <GoogleMark />
            {isGoogleSubmitting ? 'Redirecting...' : 'Continue with Google'}
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-sm font-bold uppercase text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {message ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">{message}</Alert> : null}
          {error ? <Alert className="border-rose-200 bg-rose-50 text-rose-700">{error}</Alert> : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <AuthField label="Email" icon={<Mail className="h-5 w-5" aria-hidden="true" />}>
              <Input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="h-12 rounded-xl pl-12 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </AuthField>

            <AuthField
              label="Password"
              icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
              action={
                mode === 'sign-in' ? (
                  <button type="button" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                    Forgot password?
                  </button>
                ) : null
              }
            >
              <Input
                type="password"
                placeholder="••••••••"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                className="h-12 rounded-xl pl-12 text-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </AuthField>

            {mode === 'sign-up' ? (
              <AuthField label="Confirm Password" icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-12 rounded-xl pl-12 text-base"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </AuthField>
            ) : null}

            {children}

            <Button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="h-12 w-full rounded-xl bg-indigo-700 text-sm font-bold text-white shadow-sm hover:bg-indigo-800"
            >
              {isSubmitting ? 'Please wait...' : submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-base font-semibold text-slate-500">
        {footerText}{' '}
        <Link href={footerHref} className="font-bold text-indigo-700 hover:text-indigo-800">
          {footerLinkText}
        </Link>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AuthField({
  label,
  icon,
  action,
  children,
}: {
  label: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-4 text-base font-bold text-slate-900">
        {label}
        {action}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}
