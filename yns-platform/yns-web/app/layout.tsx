import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Champion Dashboard | Your Next Steps-US",
  description:
    "Track student progress, review AI interview feedback, and help students prepare for their next opportunity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
