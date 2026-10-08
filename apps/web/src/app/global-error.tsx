'use client';

import { ErrorView } from '@/components/error-view';
import type { ErrorViewProps } from '@/components/error-view';
import { plex } from '@/lib/fonts';
import './globals.css';

// Replaces the root layout when it fails, so it brings its own document, font and styles.
export default function GlobalError(props: ErrorViewProps) {
  return (
    <html lang="en" className={plex.variable}>
      <body className="min-h-screen font-sans antialiased">
        <title>Something went wrong</title>
        <main>
          <ErrorView {...props} />
        </main>
      </body>
    </html>
  );
}
