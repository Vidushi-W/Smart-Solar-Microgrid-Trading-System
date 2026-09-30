const usersPath = '/api/users';

export async function getUsers() {
  const response = await fetchWithAuth(usersPath);
  return response.json();
}

export async function createUser(user) {
  const response = await fetchWithAuth(usersPath, {
    method: 'POST',
    body: JSON.stringify(user)
  });
  return response.json();
}

export async function updateUser(id, user) {
  const response = await fetchWithAuth(`${usersPath}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user)
  });
  return response.json();
}

export async function updateUserStatus(id, isActive) {
  const response = await fetchWithAuth(`${usersPath}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive })
  });
  return response.json();
}

export async function getPendingProsumers() {
  const response = await fetchWithAuth('/api/prosumers/pending');
  return response.json();
}

export async function getDeactivatedProsumers() {
  const response = await fetchWithAuth('/api/prosumers/deactivated');
  return response.json();
}

export async function activateProsumer(id) {
  const response = await fetchWithAuth(`/api/prosumers/${id}/activate`, { method: 'POST' });
  return response.json();
}

export async function deactivateProsumer(id) {
  const response = await fetchWithAuth(`/api/prosumers/${id}/deactivate`, { method: 'POST' });
  return response.json();
}

export async function reactivateProsumer(id) {
  const response = await fetchWithAuth(`/api/prosumers/${id}/reactivate`, { method: 'POST' });
  return response.json();
}

async function fetchWithAuth(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with status ${response.status}.`);
  }
  return response;
}
