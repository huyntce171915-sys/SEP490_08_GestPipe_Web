import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authService from '../services/authService';
import adminService from '../services/adminService';
import { useTheme } from '../utils/ThemeContext'; // Vẫn giữ
import { Loader2 } from 'lucide-react'; // Thêm Loader
import { motion } from 'framer-motion'; // Thêm motion

// (Bỏ import: Sun, Moon, Bell, ChevronDown, UserIcon, Sidebar, AdminSidebar, Logo, backgroundImage)

// Hiệu ứng chuyển động
const pageVariants = {
  initial: { opacity: 0, x: "20px" },
  animate: { opacity: 1, x: "0px" },
  exit: { opacity: 0, x: "-20px" },
  transition: { type: 'tween', ease: 'anticipate', duration: 0.3 }
};

// Component con cho các hàng thông tin
const InfoRow = ({ label, value }) => {
  const { theme } = useTheme();
  return (
    <tr>
      <td className={`py-3 pr-6 font-semibold text-base align-top ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ width: '180px' }}>
        {label}:
      </td>
      <td className={`py-3 text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {value}
      </td>
    </tr>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Bỏ toggleTheme
  const { t } = useTranslation();
  
  // (Bỏ state layout: admin, showUserDropdown)
  const [profileData, setProfileData] = useState(null); // Đổi tên state
  const [loading, setLoading] = useState(true);

  // Lấy profile data
  const fetchProfile = useCallback(async (adminId) => {
    try {
      setLoading(true);
      const response = await adminService.getProfile(adminId);
      setProfileData(response.admin);
      // Cập nhật localStorage (rất tốt, để layout luôn có data mới nhất)
      localStorage.setItem('admin', JSON.stringify(response.admin));
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('notifications.failedLoadProfile'));
      // Fallback to localStorage data
      const adminData = localStorage.getItem('admin');
      if (adminData) {
        setProfileData(JSON.parse(adminData));
      }
    } finally {
      setLoading(false);
    }
  }, [t]); // Thêm t

  // Check login và fetch data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const adminData = authService.getCurrentUser();
    if (!adminData) {
      navigate('/');
      return;
    }

    fetchProfile(adminData._id || adminData.id);
  }, [navigate, fetchProfile]);

  // (Bỏ handleLogout)

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN'); // Dùng format VN
  };

  // (Bỏ formatDateTime, dùng formatDate)

  if (loading || !profileData) {
    return (
      <motion.main 
        className="flex-1 overflow-hidden p-8 font-montserrat flex flex-col items-center justify-center"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageVariants.transition}
      >
        <Loader2 size={48} className="text-cyan-500 animate-spin" />
        <p className="text-lg font-medium text-cyan-500 mt-4">{t('profile.loading') || 'Loading Profile...'}</p>
      </motion.main>
    );
  }

  return (
    // (Bỏ div layout)
    <motion.main 
      className="flex-1 overflow-y-auto p-8 font-montserrat flex flex-col items-center justify-center"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageVariants.transition}
    >
      <div className="w-full max-w-2xl">
        {/* Profile Card (Style "kính mờ") */}
        <div className={`backdrop-blur-lg rounded-2xl border shadow-xl p-8 sm:p-10 transition-colors duration-300
                        ${theme === 'dark' 
                          ? 'bg-black/50 border-white/20' 
                          : 'bg-white/80 border-gray-200'}`}>
          <h2 className={`text-3xl font-bold text-center mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {t('profile.title')}
          </h2>

          {/* Profile Info Table */}
          <table className="w-full">
            <tbody>
              <InfoRow 
                label={t('profile.name')} 
                value={profileData.fullName || 'N/A'} 
              />
              <InfoRow 
                label={t('profile.dateOfBirth')} 
                value={formatDate(profileData.birthday)} 
              />
              <InfoRow 
                label={t('profile.email')} 
                value={profileData.email || 'N/A'} 
              />
              <InfoRow 
                label={t('profile.phone')} 
                value={profileData.phoneNumber || 'N/A'} 
              />
              <InfoRow 
                label={t('profile.address')} 
                value={profileData.province || 'N/A'} 
              />
              <InfoRow 
                label={t('profile.role')} 
                value={
                  <span className={`px-3 py-1 rounded-full font-semibold text-sm capitalize ${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-800'}`}>
                    {profileData.role}
                  </span>
                } 
              />
              <InfoRow 
                label={t('profile.createdAt')} 
                value={formatDate(profileData.createdAt)} 
              />
            </tbody>
          </table>

          {/* Action Buttons (Style mới) */}
          <div className="flex gap-4 mt-8 justify-end">
            <button
              onClick={() => navigate('/change-password')}
              className={`px-6 py-2 rounded-lg font-medium transition-all
                         ${theme === 'dark' ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              {t('profile.changePassword')}
            </button>
            <button
              onClick={() => navigate('/edit-profile')}
              className="px-6 py-2 rounded-lg font-medium transition-all
                         bg-gradient-to-r from-blue-600 to-cyan-500 text-white
                         hover:from-blue-500 hover:to-cyan-400"
            >
              {t('profile.edit')}
            </button>
          </div>
        </div>
      </div>
    </motion.main>
    // (Bỏ div layout)
  );
};

export default Profile;