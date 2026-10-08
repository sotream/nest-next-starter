'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { NAV_ITEMS } from '@/lib/nav';
import { Button } from './button';
import { Logo } from './logo';
import { Message } from './message';

const DESKTOP_QUERY = '(min-width: 48rem)';

function SidebarContent({
  onNavigate,
  onSignOut,
}: {
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 font-semibold">
        <Logo />
        nest-next-starter
      </Link>
      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-10 items-center rounded-md px-3 text-sm ${
                    active ? 'bg-accent/10 font-semibold text-accent' : 'hover:bg-zinc-100'
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-zinc-300 pt-4 text-sm">
        <p className="mb-2 truncate text-zinc-600" title={user?.email}>
          {user?.email}
        </p>
        <Button variant="secondary" className="w-full" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

/** Guards the private routes and frames them with a sidebar (a drawer behind a burger on phones). */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, signOut, retry } = useAuth();
  const drawer = useRef<HTMLDialogElement>(null);
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/sign-in');
  }, [status, router]);

  // A modal dialog left open would keep the page inert after the sidebar becomes permanent.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = () => query.matches && drawer.current?.close();
    query.addEventListener('change', closeOnDesktop);
    return () => query.removeEventListener('change', closeOnDesktop);
  }, []);

  if (status === 'error') {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8">
        <Message alert>
          We could not check your session. Check your connection and try again.
        </Message>
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }
  if (status !== 'authenticated') return <Message>Loading…</Message>;

  const closeDrawer = () => drawer.current?.close();

  async function handleSignOut() {
    closeDrawer();
    setSignOutFailed(false);
    try {
      await signOut();
    } catch {
      setSignOutFailed(true);
    }
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-300 bg-white md:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent onNavigate={closeDrawer} onSignOut={() => void handleSignOut()} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-zinc-300 bg-white px-4 py-2 md:hidden">
          <Button
            variant="secondary"
            aria-label="Open menu"
            aria-haspopup="dialog"
            className="w-10 px-0"
            onClick={() => drawer.current?.showModal()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </Button>
          <Logo />
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          {signOutFailed && (
            <div className="mb-6">
              <Message alert>
                We could not sign you out. Check your connection and try again.
              </Message>
            </div>
          )}
          {children}
        </main>
      </div>

      <dialog
        ref={drawer}
        aria-label="Menu"
        // A click on the backdrop is dispatched on the dialog itself, a click on its content on a child.
        onClick={(event: MouseEvent<HTMLDialogElement>) =>
          event.target === event.currentTarget && closeDrawer()
        }
        className="m-0 h-dvh max-h-none w-64 max-w-[80vw] bg-white p-0 text-ink backdrop:bg-black/40 md:hidden"
      >
        <SidebarContent onNavigate={closeDrawer} onSignOut={() => void handleSignOut()} />
      </dialog>
    </div>
  );
}
