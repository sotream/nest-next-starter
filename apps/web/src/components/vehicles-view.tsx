'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import type { Page, Vehicle, VehicleInput } from '@/lib/types';
import { PAGE_SIZE, useVehiclePage } from '@/lib/use-vehicle-page';
import { Button } from './button';
import { VehicleForm } from './vehicle-form';
import { VehicleRow } from './vehicle-row';

/** `new` opens the create form; a vehicle opens the edit form; null shows neither. */
type Editing = 'new' | Vehicle | null;

function Message({ children, alert = false }: { children: string; alert?: boolean }) {
  return (
    <p role={alert ? 'alert' : 'status'} className="border-y border-zinc-300 py-10 text-zinc-600">
      {children}
    </p>
  );
}

function Pagination({
  page,
  onChange,
}: {
  page: Page<Vehicle>;
  onChange: (offset: number) => void;
}) {
  const from = page.total === 0 ? 0 : page.offset + 1;
  const to = page.offset + page.items.length;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <p className="text-zinc-600">
        {from}–{to} of {page.total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page.offset === 0}
          onClick={() => onChange(Math.max(0, page.offset - PAGE_SIZE))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={to >= page.total}
          onClick={() => onChange(page.offset + PAGE_SIZE)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

export function VehiclesView() {
  const router = useRouter();
  const { status, user, signOut, retry } = useAuth();
  const { state, reload, goTo } = useVehiclePage();
  const [editing, setEditing] = useState<Editing>(null);
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/sign-in');
  }, [status, router]);

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

  async function handleSignOut() {
    setSignOutFailed(false);
    try {
      await signOut();
    } catch {
      setSignOutFailed(true);
    }
  }

  async function save(input: VehicleInput) {
    await (editing && editing !== 'new'
      ? api.vehicles.update(editing.id, input)
      : api.vehicles.create(input));
    setEditing(null);
    reload();
  }

  async function remove(vehicle: Vehicle, page: Page<Vehicle>) {
    await api.vehicles.remove(vehicle.id);
    // Deleting the last row of a later page would leave an empty page, so step back first.
    if (page.items.length === 1 && page.offset > 0) goTo(page.offset - PAGE_SIZE);
    else reload();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 pb-4">
        <h1 className="text-2xl font-semibold">Vehicles</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600">{user?.email}</span>
          <Button variant="secondary" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </header>

      {signOutFailed && (
        <div className="mb-6">
          <Message alert>We could not sign you out. Check your connection and try again.</Message>
        </div>
      )}

      {editing ? (
        <div className="mb-6">
          <VehicleForm
            key={editing === 'new' ? 'new' : editing.id}
            vehicle={editing === 'new' ? undefined : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <div className="mb-6">
          <Button onClick={() => setEditing('new')}>Add vehicle</Button>
        </div>
      )}

      {state.status === 'loading' && <Message>Loading vehicles…</Message>}
      {state.status === 'error' && (
        <div className="space-y-3">
          <Message alert>
            We could not load your vehicles. Check your connection and try again.
          </Message>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}
      {state.status === 'ready' && state.page.items.length === 0 && (
        <Message>No vehicles yet. Add your first vehicle to get started.</Message>
      )}
      {state.status === 'ready' && state.page.items.length > 0 && (
        <>
          <ul className="divide-y divide-zinc-300 border-y border-zinc-300">
            {state.page.items.map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => setEditing(vehicle)}
                onDelete={() => remove(vehicle, state.page)}
              />
            ))}
          </ul>
          <Pagination page={state.page} onChange={goTo} />
        </>
      )}
    </div>
  );
}
