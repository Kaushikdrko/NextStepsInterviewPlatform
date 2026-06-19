import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthPageFrame } from '@/components/auth/AuthPageFrame';

export default function SignUpPage() {
  return (
    <AuthPageFrame>
      <AuthFormCard
        title="Create your account"
        subtitle="Sign up to get started"
        mode="sign-up"
        footerText="Already have an account?"
        footerHref="/sign-in"
        footerLinkText="Log in"
        submitLabel="Create account"
      />
    </AuthPageFrame>
  );
}
