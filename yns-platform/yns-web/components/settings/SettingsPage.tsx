'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type AccountState = {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountError, setAccountError] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      try {
        setIsLoading(true);
        setAccountError('');

        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error(error?.message ?? 'You must be signed in to view settings.');
        }

        if (!isMounted) return;

        setAccount({
          id: user.id,
          email: user.email ?? 'Unknown email',
          emailConfirmedAt: user.email_confirmed_at ?? null,
          lastSignInAt: user.last_sign_in_at ?? null,
        });
      } catch (error) {
        if (isMounted) {
          setAccountError(error instanceof Error ? error.message : 'Unable to load settings.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError('');
    setAccountMessage('');

    if (newPassword.length < 6) {
      setAccountError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountError('Passwords do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw new Error(error.message);
      }

      setNewPassword('');
      setConfirmPassword('');
      setAccountMessage('Password updated successfully.');
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/sign-in');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />

      <div className="min-h-screen px-4 py-6 sm:px-6 lg:pl-[220px]">
        <div className="mx-auto w-full max-w-6xl space-y-5 lg:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link href="/dashboard" className="transition hover:text-slate-950">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="text-slate-950">Settings</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Settings</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Manage account access and security.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/profile"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Profile
              </Link>
              <Link
                href="/history"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                History
              </Link>
            </div>
          </div>

          {isLoading ? (
            <Card className="rounded-[10px] border-slate-200 bg-white shadow-sm">
              <CardContent className="flex items-center gap-3 p-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-500">Loading settings...</p>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && accountError && !account ? (
            <Alert className="border-rose-200 bg-rose-50 text-rose-700">{accountError}</Alert>
          ) : null}

          {!isLoading && account ? (
            <div className="max-w-4xl">
              <div>
                <Card id="account-security" className="rounded-[10px] border-slate-200 bg-white shadow-sm">
                  <CardHeader className="space-y-1 p-5">
                    <CardTitle className="flex items-center gap-3 text-lg font-extrabold text-slate-950">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      Account & Security
                    </CardTitle>
                    <p className="text-sm font-semibold text-slate-500">
                      Review your login email, verification status, and password.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5 pt-0">
                    {accountMessage ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">{accountMessage}</Alert> : null}
                    {accountError ? <Alert className="border-rose-200 bg-rose-50 text-rose-700">{accountError}</Alert> : null}

                    <div className="divide-y divide-slate-200 rounded-[10px] border border-slate-200">
                      <SettingsRow icon={Mail} label="Email address" value={account.email}>
                        <Badge
                          className={cn(
                            'border-0 px-3 py-1 font-extrabold',
                            account.emailConfirmedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          {account.emailConfirmedAt ? 'Verified' : 'Unverified'}
                        </Badge>
                      </SettingsRow>
                      <SettingsRow icon={CheckCircle2} label="Email verified" value={formatDateTime(account.emailConfirmedAt)} />
                      <SettingsRow icon={KeyRound} label="Last sign in" value={formatDateTime(account.lastSignInAt)} />
                    </div>

                    <form className="rounded-[10px] border border-slate-200 p-4" onSubmit={handlePasswordUpdate}>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-950">Change password</p>
                          <p className="text-xs font-semibold text-slate-500">Use at least 6 characters.</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="h-11 rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-new-password">Confirm password</Label>
                          <Input
                            id="confirm-new-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="h-11 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-slate-500">
                          OTP signup emails are controlled through Supabase email settings.
                        </p>
                        <Button type="submit" disabled={isUpdatingPassword} className="h-10 rounded-lg bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-500">
                          {isUpdatingPassword ? 'Updating...' : 'Update password'}
                        </Button>
                      </div>
                    </form>

                    <div className="flex flex-col gap-3 rounded-[10px] border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-slate-950">Session access</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Sign out from this browser.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={handleLogout} className="h-10 rounded-lg font-bold">
                        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                        Log out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-extrabold text-slate-950">{value}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
