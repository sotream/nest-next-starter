export function Message({ children, alert = false }: { children: string; alert?: boolean }) {
  return (
    <p role={alert ? 'alert' : 'status'} className="border-y border-zinc-300 py-10 text-zinc-600">
      {children}
    </p>
  );
}
