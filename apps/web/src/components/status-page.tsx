import type { ReactNode } from 'react';
import { PlateChip } from './plate-chip';
import { RouteIllustration } from './route-illustration';

/** Full-height centred message with an illustration. Used by the 404 and error pages. */
export function StatusPage({
  variant,
  code,
  title,
  description,
  children,
}: {
  variant: 'missing' | 'failed';
  code: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <RouteIllustration variant={variant} className="mb-6 w-full max-w-lg" />
      <PlateChip plate={code} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-zinc-600">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
    </div>
  );
}
