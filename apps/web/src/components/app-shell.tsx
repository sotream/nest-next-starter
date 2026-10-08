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
    <div className="flex h-full flex-col bg-sidebar text-sidebar-ink">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4 font-semibold tracking-tight text-white"
      >
        <Logo className="size-7" />
        nest-next-starter
      </Link>
      <nav aria-label="Main" className="flex-1 p-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium ${
                    active ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className={`size-[18px] shrink-0 ${active ? 'text-white' : 'text-sidebar-ink'}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={icon} />
                  </svg>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-1 pb-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
          >
            {user?.email.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white" title={user?.email}>
              {user?.email}
            </p>
            <p className="text-xs">{user?.role === 'ADMIN' ? 'Administrator' : 'User'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-white/5 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-[18px] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
          </svg>
          Sign out
        </button>
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
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent onNavigate={closeDrawer} onSignOut={() => void handleSignOut()} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center gap-2 bg-sidebar px-3 text-white md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            className="flex size-10 items-center justify-center rounded-md hover:bg-white/10"
            onClick={() => drawer.current?.showModal()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
          <Logo className="size-7" />
          <span className="font-semibold tracking-tight">nest-next-starter</span>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
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
        className="m-0 h-dvh max-h-none w-64 max-w-[80vw] bg-sidebar p-0 backdrop:bg-black/50 md:hidden"
      >
        <SidebarContent onNavigate={closeDrawer} onSignOut={() => void handleSignOut()} />
      </dialog>
    </div>
  );
}
