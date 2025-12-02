// src/components/AdminLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
// ===== THAY ĐỔI 1: Import thêm useLocation và Outlet =====
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastContainer, toast } from 'react-toastify';
import Logo from '../assets/images/Logo.png';
import backgroundImage from '../assets/backgrounds/background.jpg';
import backgroundLightImage from '../assets/backgrounds/background_lightheme.jpg';
import { Sun, Moon, ChevronDown, User } from 'lucide-react';
import Sidebar from './Sidebar';
import AdminSidebar from './AdminSidebar';
import { useTheme } from '../utils/ThemeContext';
import authService from '../services/authService';
// ===== THAY ĐỔI 2: Import framer-motion =====
import { AnimatePresence, motion } from 'framer-motion';

// Custom Toast Component
const CustomToast = ({ message, type, onClose, theme }) => {
  console.log('CustomToast rendering:', { message, type, theme });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log('CustomToast useEffect running');
    // Show animation
    setTimeout(() => setVisible(true), 10);
    
    // Auto hide after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = theme === 'dark' ? 'bg-black/20' : 'bg-white/20';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderColor = theme === 'dark' ? 'border-white/30' : 'border-gray-300/50';

  return (
    <div 
      className={`fixed top-6 right-6 z-[9999] transform transition-all duration-500 ease-out ${
        visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`${bgColor} backdrop-blur-md ${textColor} px-6 py-4 rounded-2xl shadow-xl ${borderColor} border max-w-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl mr-3">
              {type === 'success' ? '✅' : '👋'}
            </span>
            <span className="font-medium text-sm leading-relaxed">{message}</span>
          </div>
          <button 
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            className={`ml-4 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200 rounded-full hover:bg-black/5 p-1`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};const AdminLayout = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); 
  const { t } = useTranslation();
  const location = useLocation(); // <-- Lấy location để biết khi nào URL thay đổi

  // STATE NỘI BỘ CỦA LAYOUT
  const [admin, setAdmin] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef();
  
  // Custom toast state
  const [customToast, setCustomToast] = useState(null);

  // Tự lấy thông tin admin
  useEffect(() => {
    const currentAdmin = authService.getCurrentUser();
    if (currentAdmin) {
      setAdmin(currentAdmin);
    } else {
      navigate('/'); // Nếu không có, đá về login
    }
  }, [navigate]);

  // Tự xử lý đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Tự xử lý logout
  const handleLogout = () => {
    console.log('handleLogout called');
    // Get admin name for farewell message
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const adminName = admin.fullName || 'User';
    
    authService.logout();
    
    // Show farewell toast
    console.log('Setting customToast:', { message: `Goodbye ${adminName}! 👋 See you soon!`, type: 'logout' });
    setCustomToast({
      message: `Goodbye ${adminName}! 👋 See you soon!`,
      type: 'logout'
    });
    
    // Delay navigation to allow toast to show
    setTimeout(() => {
      navigate('/');
    }, 3500);
  };

  // Nếu chưa có admin (đang fetch), hiển thị loading
  if (!admin) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
        <div className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Loading Layout...</div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${theme === 'dark' ? backgroundImage : backgroundLightImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className={`absolute inset-0 ${
          theme === "dark" ? "bg-black/80" : "bg-white/80"
        } pointer-events-none`}
      />

      <div className="relative z-10 h-full flex flex-col">
        <ToastContainer 
          theme={theme === "dark" ? "dark" : "light"}
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{ zIndex: 9999 }}
        />
        
        {/* Custom Toast */}
        {customToast && (
          <CustomToast
            message={customToast.message}
            type={customToast.type}
            theme={theme}
            onClose={() => setCustomToast(null)}
          />
        )}
        
        {/* HEADER */}
        <header
          className={`sticky top-0 z-50 border-b backdrop-blur-lg ${
            theme === "dark"
              ? "bg-black/80 border-white/25"
              : "bg-white/90 border-gray-200"
          }`}
        >
          {/* ... (Toàn bộ code Header giữ nguyên) ... */}
          <div className="px-6 py-4 flex items-center justify-between relative h-24">
            {/* Logo Center */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
              <img src={Logo} alt="GestPipe" className="h-20 object-contain" />
            </div>

            {/* Right Side: Theme Switch & Profile */}
            <div className="ml-auto flex items-center gap-3 z-20">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all duration-200 ease-in-out shadow-sm border ${
                  theme === "dark"
                    ? "bg-white/10 text-gray-100 border-white/10 hover:bg-white/20"
                    : "bg-gray-100 text-black border-gray-200 hover:bg-gray-200"
                }`}
              >
                {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown((s) => !s)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-full transition-all duration-200 ease-in-out border shadow-sm ${
                    theme === "dark"
                      ? "bg-white/10 text-gray-100 border-white/10 hover:bg-white/20"
                      : "bg-gray-100 text-black border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  <div className={`p-1 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <User size={18} className={theme === "dark" ? "text-gray-100" : "text-black"} />
                  </div>
                  <ChevronDown size={16} className={theme === "dark" ? "text-gray-400" : "text-black"} />
                </button>
                <div
                  className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-50 
                              transition-all duration-200 ease-in-out 
                              origin-top-right ${
                    theme === "dark"
                      ? "bg-gradient-table-header from-header-start-gray to-header-end-gray border border-white/25"
                      : "bg-white border border-gray-300"
                  } ${
                    showUserDropdown
                      ? "opacity-100 scale-100 pointer-events-auto"
                      : "opacity-0 scale-95 pointer-events-none"
                  }`}
                >
                  <div className="p-3 border-b border-white/20">
                    <p className={`font-montserrat font-semibold text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {admin.fullName}
                    </p>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                      {admin.email}
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-700 text-gray-100 rounded text-xs">
                      {admin.role}
                    </span>
                  </div>
                  <button
                    onClick={() => { setShowUserDropdown(false); navigate('/profile'); }}
                    className={`w-full text-left px-4 py-2 text-base font-medium transition-colors ${
                      theme === "dark" ? "text-white hover:bg-white/10" : "text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {t("profile.title", { defaultValue: "Profile" })}
                  </button>
                  <button
                    onClick={() => { setShowUserDropdown(false); navigate('/change-password'); }}
                    className={`w-full text-left px-4 py-2 text-base font-medium transition-colors ${
                      theme === "dark" ? "text-gray-300 hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {t("profile.changePassword", { defaultValue: "Change Password" })}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-base font-medium text-red-500 hover:bg-red-500/10 rounded-b-lg"
                  >
                    {t("common.logout", { defaultValue: "Logout" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* SIDEBAR + MAIN CONTENT */}
        <div className="flex flex-1 overflow-hidden">
          {admin.role === "superadmin" ? (
            <Sidebar theme={theme} onLogout={handleLogout} />
          ) : (
            <AdminSidebar theme={theme} onLogout={handleLogout} />
          )}
          
          {/* ===== THAY ĐỔI 3: BỌC OUTLET BẰNG ANIMATION ===== */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={location.pathname} // Key giúp AnimatePresence biết trang đã đổi
              className="flex-1 flex flex-col overflow-hidden" // Đảm bảo div chiếm hết không gian
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          {/* ================================================ */}
          
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;