const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiCall(endpoint, options = {}) {
  const { method = 'GET', body, token } = options;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
