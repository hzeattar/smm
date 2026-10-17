const SESSION_STORAGE_KEY = 'yd_active_session_v5';

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  try {
    const savedSession =
      typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (savedSession && !headers.has('x-yd-session')) {
      headers.set('x-yd-session', savedSession);
    }
  } catch {}

  return window.fetch(input, {
    ...init,
    credentials: init?.credentials || 'include',
    headers,
  });
}
