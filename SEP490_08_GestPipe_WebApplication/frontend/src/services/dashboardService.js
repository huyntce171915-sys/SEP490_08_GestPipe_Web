// frontend/src/services/dashboardService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/dashboard';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchDashboardUser = async () => {
  const response = await axios.get(`${API_URL}/user-overview`, {
    headers: authHeaders(),
  });
  return response.data;
};

export const fetchDashboardVersion = async () => {
  const response = await axios.get(`${API_URL}/version-overview`, {
    headers: authHeaders(),
  });
  return response.data;
};

export const fetchDashboardGesture = async () => {
  const response = await axios.get(`${API_URL}/gesture-overview`, {
    headers: authHeaders(),
  });
  return response.data;
};

export const fetchDashboardStats = async () => {
  const response = await axios.get(`${API_URL}/stats`, {
    headers: authHeaders(),
  });
  return response.data;
};

// Export default optional
export default {
  fetchDashboardUser,
  fetchDashboardVersion,
  fetchDashboardGesture,
  fetchDashboardStats
};