const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export async function login(identifier, password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
}

export async function getCurrentUser() {
  return request('/api/auth/me');
}

async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? 'Login failed.');
  }

  return body;
}
