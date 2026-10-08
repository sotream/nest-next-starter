/** A licence plate with the EU-style band and an "N". Colors follow the `accent` tokens. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="2" y="7" width="28" height="18" rx="4" className="fill-accent" />
      <path d="M8 7v18H6a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4z" className="fill-accent-strong" />
      <path d="M12 21V11h2.4l5.2 6.6V11H22v10h-2.4l-5.2-6.6V21z" fill="#fff" />
    </svg>
  );
}
