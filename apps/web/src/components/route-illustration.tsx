type Variant = 'missing' | 'failed';

/**
 * A request travelling between two nodes. In `missing` the route breaks before the target, in
 * `failed` the packet arrives and the target reports a problem. Decorative, so hidden from readers.
 */
export function RouteIllustration({
  variant,
  className = '',
}: {
  variant: Variant;
  className?: string;
}) {
  const failed = variant === 'failed';
  return (
    <svg viewBox="0 0 360 160" aria-hidden="true" className={className} fill="none">
      <defs>
        <pattern id="route-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-zinc-300" />
        </pattern>
        <radialGradient id="route-fade">
          <stop offset="0.35" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="route-mask">
          <rect width="360" height="160" fill="url(#route-fade)" />
        </mask>
      </defs>
      <rect width="360" height="160" fill="url(#route-grid)" mask="url(#route-mask)" />

      <g strokeLinecap="round" strokeWidth="2.5">
        {failed ? (
          <path d="M72 80H288" className="stroke-accent" strokeDasharray="1 7" />
        ) : (
          <>
            <path d="M72 80H158" className="stroke-accent" strokeDasharray="1 7" />
            <path d="M202 80H288" className="stroke-zinc-300" strokeDasharray="1 7" />
            <path d="M163 72v16M197 72v16" className="stroke-zinc-400" />
          </>
        )}
      </g>

      <circle cx="56" cy="80" r="15" className="fill-white stroke-accent" strokeWidth="2.5" />
      <circle cx="56" cy="80" r="5" className="fill-accent" />

      {failed ? (
        <>
          <circle cx="304" cy="80" r="15" className="route-ripple stroke-red-700" strokeWidth="2" />
          <circle cx="304" cy="80" r="15" className="fill-white stroke-red-700" strokeWidth="2.5" />
          <path d="M304 73v8" className="stroke-red-700" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="304" cy="86.500" r="1.600" className="fill-red-700" />
        </>
      ) : (
        <>
          <circle
            cx="304"
            cy="80"
            r="15"
            className="fill-white stroke-zinc-400"
            strokeWidth="2.5"
            strokeDasharray="3 5"
          />
          <path
            d="M299.500 76.500a4.500 4.500 0 1 1 6.200 4.200c-1.200.6-1.700 1.400-1.700 2.800M304 87.500v.2"
            className="stroke-zinc-400"
            strokeWidth="2.200"
            strokeLinecap="round"
          />
        </>
      )}

      {[0, 0.28].map((delay) => (
        <circle
          key={delay}
          cx="76"
          cy="80"
          r={delay ? 3.5 : 5.5}
          className="route-packet fill-accent opacity-0 motion-reduce:opacity-100"
          style={
            {
              '--route-travel': failed ? '208px' : '78px',
              animationDelay: `${delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}
