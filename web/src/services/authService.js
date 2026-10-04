/**
 * Login and current-user calls. The identifier is a username or NIC. This module does not store the token; AuthContext does that after a successful login.
 */
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
