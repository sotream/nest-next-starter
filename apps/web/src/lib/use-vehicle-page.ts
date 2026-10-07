import { useCallback, useEffect, useState } from 'react';
import { api } from './api-client';
import type { Page, Vehicle } from './types';

export const PAGE_SIZE = 10;

interface Loaded {
  key: string;
  page?: Page<Vehicle>;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; page: Page<Vehicle> };

/** Loads one page of vehicles. `reload` refetches; `goTo` changes the page. */
export function useVehiclePage() {
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${offset}:${version}`;

  useEffect(() => {
    let active = true;
    api.vehicles
      .list(PAGE_SIZE, offset)
      .then((page) => active && setLoaded({ key, page }))
      .catch(() => active && setLoaded({ key }));
    return () => {
      active = false;
    };
  }, [key, offset]);

  // Derived rather than set in the effect: a result for an older key counts as "still loading".
  let state: State = { status: 'loading' };
  if (loaded?.key === key) {
    state = loaded.page ? { status: 'ready', page: loaded.page } : { status: 'error' };
  }

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { state, offset, reload, goTo: setOffset };
}
