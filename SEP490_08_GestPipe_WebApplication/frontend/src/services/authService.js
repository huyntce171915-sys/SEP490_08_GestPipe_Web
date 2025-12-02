import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

const authService = {
  // Logout (xóa token và thông tin admin khỏi localStorage)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  },
  // Get Current User (lấy thông tin admin từ localStorage)
  getCurrentUser: () => {
    const adminData = localStorage.getItem('admin');
    return adminData ? JSON.parse(adminData) : null;
  },
  // Login
  login: async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data;
  },

  // Change Password
  changePassword: async (currentPassword, newPassword) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/change-password`,
      { currentPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  // Update Profile
  updateProfile: async (profileData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/profile`,
      profileData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  // Get Current Admin
  getCurrentAdmin: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Forgot Password: gửi OTP
  sendForgotPasswordOTP: async (email) => {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
  },

  // Forgot Password: xác thực OTP
  verifyForgotPasswordOTP: async (email, otp) => {
    const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
    return response.data;
  },

  // Forgot Password: đổi mật khẩu mới
  resetForgotPassword: async (email, newPassword) => {
    const response = await axios.post(`${API_URL}/reset-password`, { email, newPassword });
    return response.data;
  },
};

export default authService;
