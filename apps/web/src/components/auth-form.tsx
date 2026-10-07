'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from './button';
import { Field } from './field';

const COPY = {
  'sign-in': {
    title: 'Sign in',
    submit: 'Sign in',
    switchText: 'No account yet?',
    switchLabel: 'Create one',
    switchHref: '/sign-up',
  },
  'sign-up': {
    title: 'Create an account',
    submit: 'Create account',
    switchText: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '/sign-in',
  },
} as const;

function describeError(error: unknown, mode: keyof typeof COPY): string[] {
  if (!(error instanceof ApiError)) {
    return ['We could not reach the server. Check your connection and try again.'];
  }
  if (error.status === 409) return ['That email is already registered. Try signing in instead.'];
  if (error.status === 401 && mode === 'sign-in') return ['The email or password is not correct.'];
  if (error.status === 429) return ['Too many attempts. Please wait a minute and try again.'];
  return error.messages;
}

export function AuthForm({ mode }: { mode: keyof typeof COPY }) {
  const copy = COPY[mode];
  const router = useRouter();
  const { status, signIn, signUp } = useAuth();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/vehicles');
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setErrors([]);
    setSubmitting(true);
    try {
      await (mode === 'sign-in' ? signIn(email, password) : signUp(email, password));
    } catch (error) {
      setErrors(describeError(error, mode));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{copy.title}</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'sign-up' ? 8 : undefined}
          hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}
        />
        <div role="alert" aria-live="polite">
          {errors.map((message) => (
            <p key={message} className="text-sm text-red-700">
              {message}
            </p>
          ))}
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Please wait…' : copy.submit}
        </Button>
      </form>
      <p className="mt-6 text-sm text-zinc-600">
        {copy.switchText}{' '}
        <Link href={copy.switchHref} className="font-medium text-accent underline">
          {copy.switchLabel}
        </Link>
      </p>
    </main>
  );
}
