import { apiRequest } from './apiClient';

export async function login(identifier, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier, password }
  });
}

export async function getCurrentUser() {
  return apiRequest('/auth/me');
}
