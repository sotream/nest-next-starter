'use client';

import { ErrorView } from '@/components/error-view';
import type { ErrorViewProps } from '@/components/error-view';

// Inside the private layout, so the sidebar stays and only the page content is replaced.
export default function PrivateError(props: ErrorViewProps) {
  return <ErrorView {...props} />;
}
