// src/components/AdminSidebar.jsx

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// ===== THAY ĐỔI ICON Ở ĐÂY =====
import { Gamepad2, User as UserIcon, Layers } from 'lucide-react'; // Bỏ Home, Users, Settings
import LanguageSwitcher from './LanguageSwitcher';

const AdminSidebar = ({ theme, onLogout }) => { // Thêm onLogout (từ AdminLayout)
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // ===== SỬA LẠI MENU ITEMS =====
  const menuItems = [
    {
      id: 'gestures',
      label: t('sidebar.gestureController', { defaultValue: 'Gesture Controller' }), // Đồng bộ key
      icon: Gamepad2, // Giữ icon này
      path: '/gestures', 
    },
    // {
    //   id: 'gesture-practice-ml',
    //   label: t('sidebar.mlGesturePractice', { defaultValue: 'ML Gesture Practice' }),
    //   icon: Gamepad2, // Sử dụng cùng icon
    //   path: '/gesture-practice-ml',
    // },
    {
      id: 'user',
      label: t('sidebar.userManagement', { defaultValue: 'User Management' }), // Đồng bộ key
      icon: UserIcon, // <-- ĐỔI ICON
      path: '/user-list',
    },
    {
      id: 'version',
      label: t('sidebar.version', { defaultValue: 'Version' }), // Đồng bộ key
      icon: Layers, // <-- ĐỔI ICON
      path: '/version-list', 
    },
  ];
  // ==============================

  return (
    <aside 
      className={`w-75 h-full flex flex-col flex-shrink-0
                 backdrop-blur-lg 
                 border-r transition-all duration-300 ease-in-out
                 ${theme === 'dark' 
                   ? 'bg-black/80 border-white/25' 
                   : 'bg-white/90 border-gray-200'}`}
    >
      <nav className="flex-1 pt-6 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path); 
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
              className={`w-full flex items-center gap-4 px-6 py-3 rounded-lg 
                          transition-colors duration-200 ease-in-out ${ 
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold' // Style Active
                  : theme === 'dark'
                    ? 'text-gray-200 hover:text-white hover:bg-white/10' // Style Inactive Dark
                    : 'text-black hover:text-black hover:bg-black/5'  // Style Inactive Light
              }`}
            >
              <Icon size={25} />
              <span className="font-semibold text-base truncate">{item.label}</span> 
            </button>
          );
        })}
      </nav>

      <div className="pb-6 flex gap-3 justify-start px-11">
        <LanguageSwitcher theme={theme} /> 
      </div>
    </aside>
  );
};

export default AdminSidebar;