import axios from 'axios';

const API_URL = 'http://localhost:5000/api/user';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

// Lấy danh sách tất cả user
export const fetchAllUsers = async () => {
  const response = await axios.get(`${API_URL}/user-all`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Lấy chi tiết user theo id
export const fetchUserById = async (userId) => {
  const response = await axios.get(`${API_URL}/user/${userId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Khoá user theo id
export const lockUser = async (userId) => {
  const response = await axios.post(
    `${API_URL}/user/${userId}/lock`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

// Mở khoá user theo id
export const unlockUser = async (userId) => {
  const response = await axios.post(
    `${API_URL}/user/${userId}/unlock`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

// Export gọn
export default {
  fetchAllUsers,
  fetchUserById,
  lockUser,
  unlockUser,
};