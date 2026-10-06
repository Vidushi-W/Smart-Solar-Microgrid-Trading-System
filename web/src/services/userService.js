/**
 * Account and prosumer calls. Request paths already start with /api. If VITE_API_URL also ends with /api, that prefix is stripped so the URL is not /api/api.
 */
import { ACCOUNT_API_BASE } from './apiTargets';
const usersPath = '/api/users';

export async function registerProsumer(request) {
  const response = await fetchWithAuth('/api/prosumers/register', {
    method: 'POST',
    body: JSON.stringify(request)
  });
  return response.json();
}

export async function getUser(id) {
  const response = await fetchWithAuth(`${usersPath}/${encodeURIComponent(id)}`);
  return response.json();
}

export async function getMyStaffProfile() {
  const response = await fetchWithAuth(`${usersPath}/me/profile`);
  return response.json();
}

export async function updateMyStaffProfile(profile) {
  const response = await fetchWithAuth(`${usersPath}/me/profile`, {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
  return response.json();
}

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

export async function getProsumers() {
  const response = await fetchWithAuth('/api/prosumers');
  return response.json();
}

export async function getProsumerByNic(nic) {
  const response = await fetchWithAuth(`/api/prosumers/${encodeURIComponent(nic)}`);
  return response.json();
}

export async function updateProsumerByNic(nic, profile) {
  const response = await fetchWithAuth(`/api/prosumers/${encodeURIComponent(nic)}`, {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
  return response.json();
}

export async function getDeactivatedProsumers() {
  const response = await fetchWithAuth('/api/prosumers/deactivated');
  return response.json();
}

export async function activateProsumer(id) {
  const response = await fetchWithAuth(`/api/prosumers/${encodeURIComponent(id)}/activate`, { method: 'POST' });
  return response.json();
}

export async function deactivateProsumer(id) {
  const response = await fetchWithAuth(`/api/prosumers/${encodeURIComponent(id)}/deactivate`, { method: 'POST' });
  return response.json();
}

export async function requestProsumerDeactivationByBackoffice(id) {
  const response = await fetchWithAuth(`/api/prosumers/${encodeURIComponent(id)}/request-deactivation`, { method: 'POST' });
  return response.json();
}

export async function reactivateProsumer(id) {
  const response = await fetchWithAuth(`/api/prosumers/${encodeURIComponent(id)}/reactivate`, { method: 'POST' });
  return response.json();
}

export async function getProsumerProfile() {
  const response = await fetchWithAuth('/api/prosumers/me/profile');
  return response.json();
}

export async function updateProsumerProfile(profile) {
  const response = await fetchWithAuth('/api/prosumers/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
  return response.json();
}

export async function requestProsumerDeactivation() {
  const response = await fetchWithAuth('/api/prosumers/me/deactivation', { method: 'POST' });
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

  // Paths in this file already include /api. Drop a second /api from the base so the request is not sent to /api/api.
  const configuredBase = import.meta.env.VITE_API_URL ?? ACCOUNT_API_BASE;
  const normalizedBase = configuredBase.endsWith('/api') ? configuredBase : configuredBase.replace(/\/$/, '');
  const normalizedPath = configuredBase.endsWith('/api') ? path.replace(/^\/api/, '') : path;
  const response = await fetch(`${normalizedBase}${normalizedPath}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? body.detail ?? body.title ?? `Request failed with status ${response.status}.`);
  }
  return response;
}
