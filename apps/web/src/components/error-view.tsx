'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button, buttonClasses } from './button';
import { StatusPage } from './status-page';

/** Props Next passes to an error boundary. `digest` matches the error to the server log. */
export interface ErrorViewProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export function ErrorView({ error, retry }: ErrorViewProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      variant="failed"
      code="ERR"
      title="Something went wrong"
      description="We could not show this page. Try again, and if it keeps happening, reload the page or come back later."
    >
      <Button onClick={retry}>Try again</Button>
      <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
        Go to vehicles
      </Link>
      {error.digest && (
        <p className="w-full text-xs text-zinc-600">
          Reference: <span className="select-all">{error.digest}</span>
        </p>
      )}
    </StatusPage>
  );
}
