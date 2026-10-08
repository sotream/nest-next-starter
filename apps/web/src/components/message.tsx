export function Message({ children, alert = false }: { children: string; alert?: boolean }) {
  return (
    <p
      role={alert ? 'alert' : 'status'}
      className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-zinc-600"
    >
      {children}
    </p>
  );
}
