import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export const inputClass =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500';

export function Field({ label, hint, id, ...input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input id={id} className={inputClass} {...input} />
      {hint && <p className="mt-1 text-sm text-zinc-600">{hint}</p>}
    </div>
  );
}
