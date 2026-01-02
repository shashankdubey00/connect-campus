import api from './api.js';

export const signup = async (email, password) => {
  return await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const login = async (email, password) => {
  return await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const logout = async () => {
  return await api('/api/auth/logout', {
    method: 'POST',
  });
};

export const verifyAuth = async () => {
  return await api('/api/auth/verify', {
    method: 'GET',
  });
};

export const getGoogleAuthUrl = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${API_BASE_URL}/api/auth/google`;
};

export const forgotPassword = async (email) => {
  return await api('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const verifyOTP = async (email, otp) => {
  return await api('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
};

export const resetPassword = async (email, resetToken, newPassword) => {
  return await api('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
};

export const setPassword = async (password) => {
  return await api('/api/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
};


