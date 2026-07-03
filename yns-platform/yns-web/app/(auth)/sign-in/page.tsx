import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';

export default function SignInPage() {
  return (
    <AuthPageFrame>
      <AuthFormCard
        title="Welcome back"
        subtitle="Log in to your account"
        mode="sign-in"
        footerText="Don't have an account?"
        footerHref="/sign-up"
        footerLinkText="Create one"
        submitLabel="Log in"
      />
    </AuthPageFrame>
  );
}
