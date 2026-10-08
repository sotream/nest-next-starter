'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { FUEL_TYPES } from '@/lib/types';
import type { FuelType, Vehicle, VehicleInput } from '@/lib/types';
import { Button } from './button';
import { Field, inputClass } from './field';

const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  ELECTRIC: 'Electric',
  HYBRID: 'Hybrid',
};

export const fuelLabel = (fuel: FuelType): string => FUEL_LABELS[fuel];

function describeError(error: unknown): string[] {
  if (!(error instanceof ApiError)) return ['We could not save the vehicle. Please try again.'];
  if (error.status === 409) return ['A vehicle with this plate number already exists.'];
  return error.messages;
}

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSubmit: (input: VehicleInput) => Promise<void>;
  onCancel: () => void;
}

/** Create form when `vehicle` is omitted, edit form otherwise. */
export function VehicleForm({ vehicle, onSubmit, onCancel }: VehicleFormProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrors([]);
    setSaving(true);
    try {
      await onSubmit({
        plateNumber: String(form.get('plateNumber') ?? ''),
        model: String(form.get('model') ?? ''),
        fuelType: String(form.get('fuelType')) as FuelType,
      });
    } catch (error) {
      setErrors(describeError(error));
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
      aria-label={vehicle ? 'Edit vehicle' : 'Add vehicle'}
    >
      <h2 className="text-lg font-semibold">{vehicle ? 'Edit vehicle' : 'Add vehicle'}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Plate number"
          id="plateNumber"
          name="plateNumber"
          defaultValue={vehicle?.plateNumber}
          required
          maxLength={20}
        />
        <Field
          label="Model"
          id="model"
          name="model"
          defaultValue={vehicle?.model}
          required
          maxLength={100}
        />
        <div>
          <label htmlFor="fuelType" className="mb-1 block text-sm font-medium text-zinc-700">
            Fuel type
          </label>
          {/* appearance-none drops the native arrow, which hugs the edge; this one has room. */}
          <div className="relative">
            <select
              id="fuelType"
              name="fuelType"
              defaultValue={vehicle?.fuelType ?? 'PETROL'}
              className={`${inputClass} appearance-none pr-10`}
            >
              {FUEL_TYPES.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {fuelLabel(fuel)}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 8 5 5 5-5" />
            </svg>
          </div>
        </div>
      </div>
      <div role="alert" aria-live="polite">
        {errors.map((message) => (
          <p key={message} className="text-sm text-red-700">
            {message}
          </p>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save vehicle'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
