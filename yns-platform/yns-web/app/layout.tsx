import './globals.css';

export const metadata = {
  title: 'NextSteps Interview Simulator',
  description: 'AI interview simulator onboarding flow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
