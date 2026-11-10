let inMemoryAccessToken = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Refresh failed');
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch((err) => {
        setAccessToken(null);
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (inMemoryAccessToken) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, config);

  // If 401 UNAUTHENTICATED and we haven't already retried
  if (response.status === 401 && !options._isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...config,
        headers,
        _isRetry: true,
      });
    } catch {
      // Refresh failed, let the 401 pass through
    }
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || 'Request failed');
    error.status = response.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}

