const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export async function login(identifier, password) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? 'Login failed.');
  }

  return body;
}
