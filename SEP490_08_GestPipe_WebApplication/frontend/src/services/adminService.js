import axios from 'axios';

const API_URL = 'http://localhost:5000/api/admin';

const adminService = {
  // Create Admin (SuperAdmin only)
  createAdmin: async (email, fullName, phoneNumber, province) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/create`,
      { 
        email, 
        fullName,
        phoneNumber,
        province
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  // Get all admins (SuperAdmin only)
  getAllAdmins: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/list`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Delete admin (SuperAdmin only)
  deleteAdmin: async (adminId) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/${adminId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Toggle admin status (SuperAdmin only)
  toggleAdminStatus: async (adminId) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/toggle-status/${adminId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  // Get profile (Admin & SuperAdmin)
  getProfile: async (adminId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `${API_URL}/profile/${adminId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  // Update profile (Admin & SuperAdmin)
  updateProfile: async (adminId, profileData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/update-profile/${adminId}`,
      profileData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  // Approve gesture request (SuperAdmin only)
  approveGestureRequest: async (userId) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/approve-gesture/${userId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  }
};

export default adminService;
