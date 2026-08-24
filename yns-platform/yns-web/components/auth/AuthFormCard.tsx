"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, LockKeyhole, LogIn, ShieldCheck, UserPlus } from 'lucide-react';

import { signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

import { LoginModeSelector } from '@/components/auth/LoginModeSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { getPostLoginRedirect, requestPasswordReset, type LoginMode } from '@/lib/services/auth';
import { API_BASE_URL } from '@/lib/utils/api-client';

type OtpStartResponse = { success: boolean; error?: string };
type OtpVerifyResponse = { success: boolean; custom_token?: string; error?: string };

async function startOtp(email: string): Promise<OtpStartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/otp/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

async function verifyOtp(email: string, code: string, password: string): Promise<OtpVerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password }),
  });
  return response.json();
}

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
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('student');
  // Set when a Champion login was denied: they are signed in already, so the
  // student experience is one click away instead of another login.
  const [studentRoute, setStudentRoute] = useState<string | null>(null);
  const Icon = mode === 'sign-in' ? LogIn : UserPlus;
  const isOtpStep = mode === 'sign-up' && Boolean(pendingOtpEmail);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get('error');

    if (callbackError) {
      setError(callbackError);
    }
  }, []);

  const handleLoginModeChange = (nextMode: LoginMode) => {
    setLoginMode(nextMode);
    setError(null);
    setMessage(null);
    setStudentRoute(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setStudentRoute(null);
    setIsSubmitting(true);

    try {
      if (mode === 'sign-up') {
        if (isOtpStep) {
          const cleanedCode = otpCode.trim();

          if (!cleanedCode) {
            setError('Enter the verification code from your email.');
            return;
          }

          const result = await verifyOtp(pendingOtpEmail, cleanedCode, password);

          if (!result.success || !result.custom_token) {
            setError(result.error ?? 'Unable to verify your account. Please request a new code and try again.');
            return;
          }

          await signInWithCustomToken(getFirebaseAuth(), result.custom_token);
          router.push('/onboarding');
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const result = await startOtp(normalizedEmail);

        if (!result.success) {
          setError(result.error ?? 'Unable to start sign-up. Please try again.');
          return;
        }

        setPendingOtpEmail(normalizedEmail);
        setOtpCode('');
        setMessage(`We sent a verification code to ${normalizedEmail}. Enter it to finish creating your account.`);
        return;
      }

      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const redirect = await getPostLoginRedirect(credential.user.uid, loginMode);

      if (!redirect.redirectTo) {
        setError(redirect.error ?? 'Something went wrong. Please try again.');
        setStudentRoute(redirect.studentRoute ?? null);
        return;
      }

      router.push(redirect.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingOtpEmail) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await startOtp(pendingOtpEmail);

      if (!result.success) {
        setError(result.error ?? 'Unable to resend the code. Please try again.');
        return;
      }

      setMessage(`We sent a new verification code to ${pendingOtpEmail}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setPendingOtpEmail('');
    setOtpCode('');
    setError(null);
    setMessage(null);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const confirmationMessage = `If an account exists for ${normalizedEmail}, a password reset link has been sent. Check your inbox and spam folder.`;

    setError(null);
    setMessage(null);

    if (!normalizedEmail) {
      setError('Enter your email address first, then select Forgot password.');
      return;
    }

    setIsSendingPasswordReset(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setMessage(confirmationMessage);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'auth/user-not-found') {
        setMessage(confirmationMessage);
      } else if (err instanceof FirebaseError && err.code === 'auth/invalid-email') {
        setError('Enter a valid email address.');
      } else if (err instanceof FirebaseError && err.code === 'auth/too-many-requests') {
        setError('Too many reset attempts. Wait a few minutes and try again.');
      } else {
        setError('Unable to send a password reset email right now. Please try again.');
      }
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  return (
    <div className="min-w-0 w-full max-w-lg space-y-6">
      <div className="space-y-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4ef] text-[#a92712]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#8f200f]">{title}</h1>
          <p className="text-lg font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>

      <Card className="w-full max-w-full rounded-3xl border-[#f8bfa9] bg-white shadow-sm">
        <CardContent className="min-w-0 space-y-5 p-4 min-[380px]:p-6 sm:p-7">
          {mode === 'sign-in' ? (
            <LoginModeSelector
              value={loginMode}
              onChange={handleLoginModeChange}
              disabled={isSubmitting}
            />
          ) : null}

          {message ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">{message}</Alert> : null}
          {error ? <Alert className="border-rose-200 bg-rose-50 text-rose-700">{error}</Alert> : null}

          {studentRoute ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(studentRoute)}
              className="h-11 w-full rounded-xl border-[#f8bfa9] text-sm font-bold text-[#a92712] hover:bg-[#fff4ef]"
            >
              Continue as Student
            </Button>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isOtpStep ? (
              <>
                <AuthField label="Email" icon={<Mail className="h-5 w-5" aria-hidden="true" />}>
                  <Input
                    type="email"
                    className="h-12 rounded-xl pl-12 text-base"
                    value={pendingOtpEmail}
                    readOnly
                    required
                  />
                </AuthField>

                <AuthField label="Verification code" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter your code"
                    className="h-12 rounded-xl pl-12 text-base"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    required
                  />
                </AuthField>

                <div className="flex flex-col gap-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    className="text-left text-[#a92712] hover:text-[#8f200f]"
                    onClick={handleResendCode}
                    disabled={isSubmitting}
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    className="text-left text-slate-500 hover:text-slate-700 sm:text-right"
                    onClick={handleUseDifferentEmail}
                    disabled={isSubmitting}
                  >
                    Use a different email
                  </button>
                </div>
              </>
            ) : (
              <>
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
                      <button
                        type="button"
                        className="text-sm font-bold text-[#a92712] hover:text-[#8f200f] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void handleForgotPassword()}
                        disabled={isSubmitting || isSendingPasswordReset}
                      >
                        {isSendingPasswordReset ? 'Sending reset link...' : 'Forgot password?'}
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
              </>
            )}

            {!isOtpStep ? children : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-[#a92712] text-sm font-bold text-white shadow-sm hover:bg-[#8f200f]"
            >
              {isSubmitting
                ? loginMode === 'champion' && mode === 'sign-in'
                  ? 'Verifying Champion access...'
                  : 'Please wait...'
                : isOtpStep
                  ? 'Verify code'
                  : submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isOtpStep ? (
        <p className="px-1 text-center text-sm font-semibold leading-6 text-slate-500 sm:text-base">
          {footerText}{' '}
          <Link href={footerHref} className="font-bold text-[#a92712] hover:text-[#8f200f]">
            {footerLinkText}
          </Link>
        </p>
      ) : null}
    </div>
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
      <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-base font-bold text-slate-900">
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
