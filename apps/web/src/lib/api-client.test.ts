const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const session = { accessToken: 'fresh-token', user: { id: '1', email: 'a@b.c', role: 'USER' } };
const emptyPage = { items: [], total: 0, limit: 10, offset: 0 };

/** Module state (token, in-flight refresh) is per import, so load a clean copy for each test. */
async function loadClient(fetchMock: ReturnType<typeof vi.fn>) {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchMock);
  return import('./api-client');
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('refreshes once on 401, then retries the request with the new token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, session))
      .mockResolvedValueOnce(json(200, emptyPage));
    const { api } = await loadClient(fetchMock);

    await expect(api.vehicles.list(10, 0)).resolves.toEqual(emptyPage);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('shares one refresh between parallel requests', async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return Promise.resolve(json(200, session));
      }
      const authorized = fetchMock.mock.calls.length > 3;
      return Promise.resolve(authorized ? json(200, emptyPage) : json(401));
    });
    const { api } = await loadClient(fetchMock);

    await Promise.all([api.vehicles.list(10, 0), api.vehicles.list(10, 10)]);

    expect(refreshCalls).toBe(1);
  });

  it('signs out instead of looping when the refresh fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(401, { message: 'Unauthorized' }));
    const { api, setSessionExpiredHandler } = await loadClient(fetchMock);
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);

    await expect(api.vehicles.list(10, 0)).rejects.toMatchObject({ status: 401 });

    expect(onExpired).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2); // original request and one refresh: no retry, no loop
  });

  it('exposes the API validation messages on errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json(400, { message: ['model must not be empty'] }));
    const { api } = await loadClient(fetchMock);

    await expect(api.signIn('a@b.c', 'x')).rejects.toMatchObject({
      status: 400,
      messages: ['model must not be empty'],
    });
  });

  describe('refreshSession', () => {
    it('resolves to null when the server says there is no session', async () => {
      const { refreshSession } = await loadClient(vi.fn().mockResolvedValue(json(401)));

      await expect(refreshSession()).resolves.toBeNull();
    });

    it.each([429, 503])('rejects on %i instead of reporting a signed-out user', async (status) => {
      const { refreshSession } = await loadClient(vi.fn().mockResolvedValue(json(status)));

      await expect(refreshSession()).rejects.toMatchObject({ status });
    });

    it('queues refreshes behind a Web Lock when the browser has one', async () => {
      const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
      vi.stubGlobal('navigator', { locks: { request } });
      const { refreshSession } = await loadClient(vi.fn().mockResolvedValue(json(200, session)));

      await expect(refreshSession()).resolves.toEqual(session);

      expect(request).toHaveBeenCalledWith('starter-refresh', expect.any(Function));
    });

    it('still refreshes when Web Locks are unavailable', async () => {
      vi.stubGlobal('navigator', {});
      const { refreshSession } = await loadClient(vi.fn().mockResolvedValue(json(200, session)));

      await expect(refreshSession()).resolves.toEqual(session);
    });

    it('rejects on a network failure and allows a later retry', async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(json(200, session));
      const { refreshSession } = await loadClient(fetchMock);

      await expect(refreshSession()).rejects.toThrow('Failed to fetch');
      await expect(refreshSession()).resolves.toEqual(session);
    });
  });

  describe('signOut', () => {
    it('clears the token once the server confirms', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json(200, session))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(json(200, emptyPage));
      const { api, refreshSession } = await loadClient(fetchMock);
      await refreshSession();

      await api.signOut();
      await api.vehicles.list(10, 0);

      expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).has('Authorization')).toBe(false);
    });

    it('rejects and keeps the session when the server cannot be reached', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json(200, session))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(json(200, emptyPage));
      const { api, refreshSession } = await loadClient(fetchMock);
      await refreshSession();

      await expect(api.signOut()).rejects.toThrow('Failed to fetch');
      await api.vehicles.list(10, 0);

      expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('Authorization')).toBe(
        'Bearer fresh-token',
      );
    });

    it('treats 401 as success and clears the token: the session is already gone', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json(200, session))
        .mockResolvedValueOnce(json(401))
        .mockResolvedValueOnce(json(200, emptyPage));
      const { api, refreshSession } = await loadClient(fetchMock);
      await refreshSession();

      await expect(api.signOut()).resolves.toBeUndefined();
      await api.vehicles.list(10, 0);

      expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).has('Authorization')).toBe(false);
    });

    it('rejects when the server answers with an error', async () => {
      const { api } = await loadClient(vi.fn().mockResolvedValue(json(503)));

      await expect(api.signOut()).rejects.toMatchObject({ status: 503 });
    });
  });
});
