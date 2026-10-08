import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { plex } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'nest-next-starter', template: '%s · nest-next-starter' },
  description: 'Fullstack starter: NestJS API and Next.js web app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plex.variable}>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
