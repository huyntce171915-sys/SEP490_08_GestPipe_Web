import axios from 'axios';

const API_URL = 'http://localhost:5000/api/versions';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

// Lấy danh sách tất cả version
export const fetchAllVersions = async () => {
  const response = await axios.get(`${API_URL}/version-all`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Lấy chi tiết version theo id
export const fetchVersionById = async (versionId) => {
  const response = await axios.get(`${API_URL}/version/${versionId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Export gọn
export default {
  fetchAllVersions,
  fetchVersionById,
};