import type { ReactNode } from 'react';

/** Title row for private pages: what the page is, and its main action on the right. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-zinc-600">{description}</p>
      </div>
      {action}
    </header>
  );
}
