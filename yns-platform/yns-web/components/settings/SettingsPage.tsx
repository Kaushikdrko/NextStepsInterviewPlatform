'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { NotificationSettingsCard } from '@/components/settings/NotificationSettingsCard';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth, waitForFirebaseUser } from '@/lib/firebase/client';

type AccountState = {
  email: string;
  emailVerified: boolean;
  lastSignInAt: string | null;
  signInMethod: string;
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

function formatSignInMethod(providerIds: string[]) {
  if (providerIds.includes('google.com')) return 'Google';
  if (providerIds.includes('password')) return 'Email and password';
  return 'Email account';
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
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      try {
        setIsLoading(true);
        setAccountError('');

        const user = await waitForFirebaseUser();

        if (!user) {
          throw new Error('You must be signed in to view settings.');
        }

        if (!isMounted) return;

        setAccount({
          email: user.email ?? 'Unknown email',
          emailVerified: user.emailVerified,
          lastSignInAt: user.metadata.lastSignInTime ?? null,
          signInMethod: formatSignInMethod(user.providerData.map((provider) => provider.providerId)),
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

    void loadAccount();

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
      const user = await waitForFirebaseUser();

      if (!user) {
        throw new Error('You must be signed in to update your password.');
      }

      await updatePassword(user, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setAccountMessage('Your password was updated successfully.');
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/requires-recent-login') {
        setAccountError('For security, sign out and back in before changing your password.');
      } else {
        setAccountError(error instanceof Error ? error.message : 'Unable to update password.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRecoveryEmail = async () => {
    if (!account) return;

    setAccountError('');
    setAccountMessage('');
    setIsSendingRecovery(true);

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), account.email);
      setAccountMessage(`A password recovery email was sent to ${account.email}.`);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to send a recovery email.');
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const handleVerificationEmail = async () => {
    setAccountError('');
    setAccountMessage('');
    setIsSendingVerification(true);

    try {
      const user = await waitForFirebaseUser();

      if (!user) {
        throw new Error('You must be signed in to verify your email.');
      }

      await sendEmailVerification(user);
      setAccountMessage(`A verification email was sent to ${user.email ?? 'your email address'}.`);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to send a verification email.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleLogout = async () => {
    await signOut(getFirebaseAuth());
    router.replace('/sign-in');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#271f1b]">
      <Sidebar />

      <div className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-6 lg:min-h-screen lg:pl-[220px]">
        <div className="app-page-container lg:px-6">
          <nav className="flex items-center gap-2 text-sm font-bold text-[#8a7c75]" aria-label="Breadcrumb">
            <Link href="/dashboard" className="transition hover:text-[#ad2d1f]">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-[#aa9d95]" aria-hidden="true" />
            <span className="text-[#271f1b]">Settings</span>
          </nav>

          <header className="mt-5 border-b border-[#e8ddd5] pb-5">
            <h1 className="text-2xl font-black text-[#271f1b]">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#7d7069]">
              Manage your account security, email preferences, and current session.
            </p>
          </header>

          {isLoading ? (
            <section className="mt-6 flex items-center gap-3 rounded-[14px] border border-[#e7dbd0] bg-white p-6 shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
              <Loader2 className="h-4 w-4 animate-spin text-[#ad2d1f]" aria-hidden="true" />
              <p className="text-sm font-bold text-[#7d7069]">Loading account settings...</p>
            </section>
          ) : null}

          {!isLoading && accountError && !account ? (
            <Alert className="mt-6 border-[#efc9bf] bg-[#fff2ed] text-[#942417]">{accountError}</Alert>
          ) : null}

          {!isLoading && account ? (
            <div className="mt-5 space-y-5">
              {accountMessage ? (
                <Alert className="border-[#bfe0cd] bg-[#eef8f2] text-[#28704b]">{accountMessage}</Alert>
              ) : null}
              {accountError ? (
                <Alert className="border-[#efc9bf] bg-[#fff2ed] text-[#942417]">{accountError}</Alert>
              ) : null}

              <section className="overflow-hidden rounded-[14px] border border-[#e7dbd0] bg-white shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
                <div className="flex flex-col gap-4 border-b border-[#eee5de] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff2ed] text-[#ad2d1f]">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-base font-black text-[#271f1b]">Account overview</h2>
                      <p className="mt-1 text-xs font-medium text-[#8a7c75]">Your current identity and sign-in details.</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                      account.emailVerified
                        ? 'bg-[#eef8f2] text-[#28704b]'
                        : 'bg-[#fff4df] text-[#986315]'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {account.emailVerified ? 'Email verified' : 'Verification needed'}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 md:divide-x md:divide-[#eee5de]">
                  <AccountDetail icon={Mail} label="Email address" value={account.email} />
                  <AccountDetail icon={KeyRound} label="Sign-in method" value={account.signInMethod} />
                  <AccountDetail icon={Clock3} label="Last sign in" value={formatDateTime(account.lastSignInAt)} />
                </div>
              </section>

              <div className="grid items-stretch gap-5 lg:grid-cols-2">
                <section className="flex flex-col overflow-hidden rounded-[14px] border border-[#e7dbd0] bg-white shadow-[0_2px_5px_rgba(78,45,31,0.05)]">
                  <div className="flex items-center gap-3 border-b border-[#eee5de] px-5 py-5 sm:px-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff2ed] text-[#ad2d1f]">
                      <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-base font-black text-[#271f1b]">Password &amp; recovery</h2>
                      <p className="mt-1 text-xs font-medium text-[#8a7c75]">Update your password or request a secure reset link.</p>
                    </div>
                  </div>

                  <form className="flex flex-1 flex-col px-5 py-5 sm:px-6" onSubmit={handlePasswordUpdate}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-xs font-extrabold text-[#5f514b]">
                          New password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="h-10 rounded-lg border-[#dfd2c8] bg-white text-[#271f1b] focus-visible:border-[#ad2d1f] focus-visible:ring-[#e9bdb2]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password" className="text-xs font-extrabold text-[#5f514b]">
                          Confirm password
                        </Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="h-10 rounded-lg border-[#dfd2c8] bg-white text-[#271f1b] focus-visible:border-[#ad2d1f] focus-visible:ring-[#e9bdb2]"
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] font-medium leading-5 text-[#94867f]">
                      Use at least 6 characters. You may need to sign in again before Firebase accepts the change.
                    </p>

                    <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={handleRecoveryEmail}
                        disabled={isSendingRecovery}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-extrabold text-[#ad2d1f] transition hover:bg-[#fff2ed] disabled:opacity-60"
                      >
                        {isSendingRecovery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Email reset link
                      </button>
                      <Button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="h-10 rounded-lg bg-[#ad2d1f] px-4 font-extrabold text-white hover:bg-[#942417]"
                      >
                        {isUpdatingPassword ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        {isUpdatingPassword ? 'Updating...' : 'Update password'}
                      </Button>
                    </div>
                  </form>
                </section>

                <NotificationSettingsCard />
              </div>

              <section className="grid overflow-hidden rounded-[14px] border border-[#e7dbd0] bg-white shadow-[0_2px_5px_rgba(78,45,31,0.05)] md:grid-cols-2 md:divide-x md:divide-[#eee5de]">
                <div className="flex flex-col gap-4 border-b border-[#eee5de] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:border-b-0 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        account.emailVerified
                          ? 'bg-[#eef8f2] text-[#28704b]'
                          : 'bg-[#fff4df] text-[#986315]'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-[#271f1b]">Email verification</h2>
                      <p className="mt-1 text-xs font-medium leading-5 text-[#8a7c75]">
                        {account.emailVerified ? 'Your recovery email is ready.' : 'Verify your address to protect account recovery.'}
                      </p>
                    </div>
                  </div>
                  {!account.emailVerified ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerificationEmail}
                      disabled={isSendingVerification}
                      className="h-9 shrink-0 rounded-lg border-[#dfd2c8] font-extrabold text-[#5f514b] hover:bg-[#fbf6f1]"
                    >
                      {isSendingVerification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Verify email
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f1ec] text-[#71645e]">
                      <LogOut className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-[#271f1b]">Current session</h2>
                      <p className="mt-1 text-xs font-medium text-[#8a7c75]">Signed in on this browser.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    className="h-9 shrink-0 rounded-lg border-[#dfd2c8] font-extrabold text-[#ad2d1f] hover:bg-[#fff2ed] hover:text-[#942417]"
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    Log out
                  </Button>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function AccountDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-[#eee5de] px-5 py-4 last:border-b-0 sm:border-b-0 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff7f3] text-[#ad2d1f]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase text-[#9a8d86]">{label}</p>
        <p className="mt-1 break-words text-xs font-extrabold leading-5 text-[#4f423c]">{value}</p>
      </div>
    </div>
  );
}
