import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react'; // Bỏ các icon Header
import { toast, ToastContainer } from 'react-toastify'; // Chỉ cần ToastContainer
import 'react-toastify/dist/ReactToastify.css';
import authService from '../services/authService';
import { useTheme } from '../utils/ThemeContext';
import backgroundImage from '../assets/backgrounds/background.jpg';
import backgroundLightImage from '../assets/backgrounds/background_lightheme.jpg';
import { motion } from 'framer-motion'; // Thêm motion
import Logo from '../assets/images/Logo.png'; // Thêm Logo

// Hiệu ứng
const pageVariants = {
  initial: { opacity: 0, x: "20px" },
  animate: { opacity: 1, x: "0px" },
  exit: { opacity: 0, x: "-20px" },
  transition: { type: 'tween', ease: 'anticipate', duration: 0.3 }
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Bỏ toggleTheme
  const { t } = useTranslation();
  
  // (Bỏ state showUserDropdown)
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const [focusedInput, setFocusedInput] = useState(null);

  // Check login
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

    setAdmin(adminData);
  }, [navigate]);

  // (Bỏ handleLogout, AdminLayout sẽ tự lo)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const togglePasswordVisibility = useCallback((field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  // Maintain focus after state updates (lightweight approach)
  useLayoutEffect(() => {
    if (focusedInput) {
      const input = document.querySelector(`input[name="${focusedInput}"]`);
      if (input && document.activeElement !== input) {
        // Only restore focus if it's clearly lost (not during typing)
        const timeSinceLastFocus = Date.now() - (input.dataset.lastFocus || 0);
        if (timeSinceLastFocus > 100) { // 100ms threshold
          input.focus();
          input.dataset.lastFocus = Date.now();
        }
      }
    }
  });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.oldPassword) {
      newErrors.oldPassword = t('notifications.fillAllFields');
    }
    if (!formData.newPassword) {
      newErrors.newPassword = t('notifications.fillAllFields');
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('notifications.passwordMinLength');
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('notifications.fillAllFields');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('notifications.passwordsNotMatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword(formData.oldPassword, formData.newPassword);
      
      // Cập nhật lại localStorage nếu đây là lần đầu login
      if (admin.isFirstLogin) {
        localStorage.setItem('admin', JSON.stringify({ ...admin, isFirstLogin: false }));
      }
      
      toast.success(t('notifications.passwordChanged'));
      
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => {
        if (admin?.role === 'superadmin') {
          navigate('/dashboard');
        } else {
          navigate('/user-list');
        }
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || t('notifications.failedChangePassword'));
    } finally {
      setLoading(false);
    }
  };

  if (!admin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Check nếu là lần đầu login
  const isFirstLogin = admin.isFirstLogin === true;

  // Style input đồng bộ
  const getInputStyle = (fieldName) => `w-full px-4 py-3 rounded-lg border 
                      ${errors[fieldName] ? 'border-yellow-500' : (theme === 'dark' ? 'border-gray-700' : 'border-gray-300')}
                      ${theme === 'dark' 
                        ? 'bg-gray-900/70 text-white placeholder:text-gray-500' 
                        : 'bg-white text-gray-900 placeholder:text-gray-400'} 
                      focus:outline-none focus:border-cyan-400 pr-12 transition-colors duration-300`;
  const labelStyle = `block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`;

  // TÁCH FORM RA THÀNH COMPONENT RIÊNG
  const renderChangePasswordForm = () => (
    <div className={`backdrop-blur-lg rounded-2xl border shadow-xl p-8 sm:p-10 transition-colors duration-300
                    ${theme === 'dark' 
                      ? 'bg-black/50 border-white/20' 
                      : 'bg-white/80 border-gray-200'}`}>
      <h2 className={`text-3xl font-bold text-center mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        {t('changePassword.title')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* Old Password */}
        <div>
          <label className={labelStyle}>
            {t('changePassword.oldPassword')}
          </label>
          <div className="relative">
            <input
              type={showPasswords.old ? "text" : "password"}
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              onFocus={() => setFocusedInput('oldPassword')}
              placeholder="••••••••••"
              className={getInputStyle('oldPassword')}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('old')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {showPasswords.old ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.oldPassword && (
            <p className="text-yellow-500 text-sm mt-1">{errors.oldPassword}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className={labelStyle}>
            {t('changePassword.newPassword')}
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              onFocus={() => setFocusedInput('newPassword')}
              placeholder="••••••"
              className={getInputStyle('newPassword')}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-yellow-500 text-sm mt-1">{errors.newPassword}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className={labelStyle}>
            {t('changePassword.confirmPassword')}
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onFocus={() => setFocusedInput('confirmPassword')}
              placeholder="••••••••••"
              className={getInputStyle('confirmPassword')}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-yellow-500 text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 pt-4">
          {!isFirstLogin && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className={`px-8 py-3 font-semibold rounded-lg transition-all
                         ${theme === 'dark' ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg 
                       hover:from-blue-500 hover:to-cyan-400
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={20} className="mx-auto animate-spin" />
            ) : (
              t('changePassword.submit')
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // ====================================================================
  // PHẦN RENDER CHÍNH
  // ====================================================================
  
  if (isFirstLogin) {
    // Trường hợp 1: Lần đầu login (KHÔNG CÓ LAYOUT)
    return (
      <div 
        className="h-screen flex flex-col items-center justify-center p-8 relative pb-32"
        style={{
          backgroundImage: `url(${theme === 'dark' ? backgroundImage : backgroundLightImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay và ToastContainer vẫn cần */}
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/80'}`}></div>
        {/* ===== LỖI ĐÃ SỬA: Mtheme -> theme ===== */}
        <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} />
        
        <motion.div 
          className="relative z-10 w-full max-w-2xl flex flex-col items-center mx-auto"
          initial="initial"
          animate="animate"
          variants={pageVariants}
          transition={pageVariants.transition}
        >
          {/* Warning Message */}
          <div className={`mb-6 p-4 rounded-lg border ${
            theme === 'dark'
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}>
            <p className="text-center font-medium">
              ⚠️ {t('changePassword.firstLoginWarning') || 'This is your first login. You must change your password to continue.'}
            </p>
          </div>

          {/* Form */}
          {renderChangePasswordForm()}
        </motion.div>
      </div>
    );
  }

  // Trường hợp 2: Đổi mật khẩu bình thường (CÓ LOGO)
  // Trang này được gọi trực tiếp, không có layout
  return (
    <div 
      className="h-screen flex flex-col items-center justify-center p-8 relative pb-32"
      style={{
        backgroundImage: `url(${theme === 'dark' ? backgroundImage : backgroundLightImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay */}
      <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/80'}`}></div>
      <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} />
      
      <motion.div 
        className="relative z-10 w-full max-w-2xl flex flex-col items-center mx-auto"
        initial="initial"
        animate="animate"
        variants={pageVariants}
        transition={pageVariants.transition}
      >
        {/* Logo */}
        <div className="mb-8 pointer-events-none select-none">
          <img src={Logo} alt="GestPipe" className="h-20 object-contain" />
        </div>

        {/* Form */}
        {renderChangePasswordForm()}
      </motion.div>
    </div>
  );
};

export default ChangePassword;