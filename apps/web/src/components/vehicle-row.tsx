'use client';

import { useState } from 'react';
import type { Vehicle } from '@/lib/types';
import { Button } from './button';
import { PlateChip } from './plate-chip';
import { fuelLabel } from './vehicle-form';

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
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <PlateChip plate={vehicle.plateNumber} />
        <p className="text-zinc-700">
          {vehicle.model}
          <span className="text-zinc-600">, {fuelLabel(vehicle.fuelType).toLowerCase()}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {failed && (
          <span role="alert" className="text-sm text-red-700">
            Could not delete. Try again.
          </span>
        )}
        {confirming ? (
          <>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onEdit} aria-label={`Edit ${vehicle.plateNumber}`}>
              Edit
            </Button>
            <Button
              variant="secondary"
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
