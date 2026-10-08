import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'md' | 'sm';

const SIZES: Record<Size, string> = { md: 'min-h-10 px-4', sm: 'min-h-8 px-3' };

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong border-transparent',
  secondary: 'bg-white text-zinc-800 hover:bg-zinc-50 border-zinc-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 border-transparent',
};

/** Class names for anything that should look like a button, such as a link. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
}: { variant?: Variant; size?: Size } = {}): string {
  return `inline-flex items-center justify-center rounded-md border text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size]} ${VARIANTS[variant]}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={`${buttonClasses({ variant, size })} ${className}`} {...props} />;
}
