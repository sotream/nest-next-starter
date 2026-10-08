'use client';

import { useState } from 'react';
import type { Vehicle } from '@/lib/types';
import { Button } from './button';
import { PlateChip } from './plate-chip';
import { fuelLabel } from './vehicle-form';

/** Shared by the table header in `vehicles-view.tsx` so the columns line up. */
export const VEHICLE_COLUMNS =
  'grid items-center gap-x-4 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_5rem_13rem]';

interface VehicleRowProps {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function VehicleRow({ vehicle, onEdit, onDelete }: VehicleRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await onDelete();
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <li className={`${VEHICLE_COLUMNS} gap-y-2 px-4 py-3 hover:bg-zinc-50`}>
      <div>
        <PlateChip plate={vehicle.plateNumber} />
      </div>
      <p className="truncate font-medium">{vehicle.model}</p>
      <p className="text-sm text-zinc-600">{fuelLabel(vehicle.fuelType)}</p>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {failed && (
          <span role="alert" className="text-sm text-red-700">
            Could not delete. Try again.
          </span>
        )}
        {confirming ? (
          <>
            <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit ${vehicle.plateNumber}`}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${vehicle.plateNumber}`}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
