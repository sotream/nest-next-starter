'use client';

import { ErrorView } from '@/components/error-view';
import type { ErrorViewProps } from '@/components/error-view';

export default function RootError(props: ErrorViewProps) {
  return (
    <main>
      <ErrorView {...props} />
    </main>
  );
}
