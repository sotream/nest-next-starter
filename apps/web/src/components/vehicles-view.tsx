'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import type { Page, Vehicle, VehicleInput } from '@/lib/types';
import { PAGE_SIZE, useVehiclePage } from '@/lib/use-vehicle-page';
import { Button } from './button';
import { Message } from './message';
import { PageHeader } from './page-header';
import { VehicleForm } from './vehicle-form';
import { VehicleRow, VEHICLE_COLUMNS } from './vehicle-row';

/** `new` opens the create form; a vehicle opens the edit form; null shows neither. */
type Editing = 'new' | Vehicle | null;

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
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm"
    >
      <p className="text-zinc-600">
        {from}–{to} of {page.total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page.offset === 0}
          onClick={() => onChange(Math.max(0, page.offset - PAGE_SIZE))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
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
  const { state, reload, goTo } = useVehiclePage();
  const [editing, setEditing] = useState<Editing>(null);

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
    <div>
      <PageHeader
        title="Vehicles"
        description="Registered vehicles and their fuel type."
        action={!editing && <Button onClick={() => setEditing('new')}>Add vehicle</Button>}
      />

      {editing && (
        <div className="mb-6">
          <VehicleForm
            key={editing === 'new' ? 'new' : editing.id}
            vehicle={editing === 'new' ? undefined : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
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
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div
            className={`${VEHICLE_COLUMNS} hidden border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600 sm:grid`}
          >
            <span>Plate number</span>
            <span>Model</span>
            <span>Fuel type</span>
            <span aria-hidden="true" />
          </div>
          <ul className="divide-y divide-zinc-200">
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
        </div>
      )}
    </div>
  );
}
