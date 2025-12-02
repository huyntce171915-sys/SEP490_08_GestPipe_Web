import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify'; 
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion'; 
import { 
  Lock, Unlock, Plus, Search as SearchIcon, Loader2, ChevronDown, 
  Shield, Mail, Phone, Calendar, UserCheck, UserX, Filter
} from 'lucide-react';

import adminService from '../services/adminService';
import authService from '../services/authService';
import { useTheme } from '../utils/ThemeContext';

// Status mapping
const STATUS_LABELS = ['all', 'active', 'suspended', 'inactive'];

const getStatusBadge = (status) => {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20";
    case "suspended": return "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20";
    case "inactive": return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20";
    default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20";
  }
};

// Hiệu ứng chuyển động
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { type: 'tween', ease: 'easeOut', duration: 0.3 }
};

// ====================================================================
// COMPONENT CHÍNH: AdminList
// ====================================================================
const AdminList = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); 
  const { t } = useTranslation();

  const formatDate = (dateString) => {
    if (!dateString) return t('common.notAvailable');
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? t('common.notAvailable') : d.toLocaleString("vi-VN", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef();
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const currentAdmin = authService.getCurrentUser();
    if (!currentAdmin || !['superadmin'].includes(currentAdmin.role)) {
      navigate('/user-list'); 
      return;
    }
    fetchAdmins();
  }, [navigate]); 

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllAdmins();
      setAdmins(response.admins || []);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.message || t('notifications.failedLoadAdmins');
      setError(errorMsg); 
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ===== LOGIC LOCK/UNLOCK =====
  const handleToggleStatus = async (adminId, currentStatus) => {
    const actionText = currentStatus === 'active' ? t('alerts.suspendTitle') : t('alerts.activateTitle');
    const actionMessage = currentStatus === 'active' ? t('alerts.suspendMessage') : t('alerts.activateMessage');
    const confirmText = currentStatus === 'active' ? t('alerts.yesSuspend') : t('alerts.yesActivate');
    
    const swalConfig = {
      title: actionText,
      html: actionMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: currentStatus === 'active' ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText,
      cancelButtonText: t('alerts.cancel'),
      background: theme === 'dark' ? 'rgba(0,0,0,0.9)' : '#ffffff', 
      backdrop: `rgba(0,0,0,0.6) backdrop-blur-sm`, 
      width: '450px', 
      customClass: {
        popup: `font-montserrat rounded-2xl border ${theme === 'dark' ? 'border-white/20 bg-black/90 text-white' : 'border-gray-200 bg-white text-black'}`, 
        title: `${theme === 'dark' ? 'text-white' : 'text-black'} text-xl font-extrabold`,
        htmlContainer: `${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`,
        confirmButton: 'px-6 py-2.5 rounded-lg font-semibold shadow-lg',
        cancelButton: 'px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-700'
      }
    };

    const result = await Swal.fire(swalConfig);

    if (!result.isConfirmed) return;

    setTogglingId(adminId);
    try {
      await adminService.toggleAdminStatus(adminId);
      setAdmins(prevAdmins => 
        prevAdmins.map(admin => 
          admin._id === adminId 
            ? { ...admin, accountStatus: currentStatus === 'active' ? 'suspended' : 'active' }
            : admin
        )
      );
      
      const successMessage = currentStatus === 'active' ? t('alerts.accountSuspended') : t('alerts.accountActivated');
      
      await Swal.fire({
        title: t('alerts.success'),
        html: successMessage,
        icon: 'success',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        background: swalConfig.background,
        color: '#fff',
        customClass: swalConfig.customClass
      });
      
    } catch (err) {
        const errorMsg = err.response?.data?.message || t('notifications.failedUpdateStatus');
        await Swal.fire({
          title: t('alerts.error'),
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#ef4444',
          background: swalConfig.background,
          color: '#fff',
          customClass: swalConfig.customClass
        });
        toast.error(errorMsg);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (admin.phoneNumber && admin.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || admin.accountStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);


  return (
    <motion.main 
      className="flex-1 h-full overflow-hidden p-6 md:p-8 font-montserrat flex flex-col gap-4"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-black dark:text-white mb-2 flex items-center gap-3">
            <Shield className="text-cyan-600 dark:text-cyan-400" size={32} />
            {t('adminList.title', { defaultValue: 'Admin Management' })}
          </h1>
          <p className="text-gray-700 dark:text-gray-400 text-base font-medium">{t('adminList.subtitle', { defaultValue: 'Manage system administrators and permissions' })}</p>
        </div>

        <button 
          onClick={() => navigate('/create-admin')}
          className="flex items-center gap-2 px-5 py-2 font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20
                     bg-gradient-to-r from-cyan-600 to-blue-600 text-white 
                     hover:from-cyan-500 hover:to-blue-500 hover:scale-105 active:scale-95"
        >
          <Plus size={20} />
          {t('adminList.createNew')}
        </button>
      </div>
      
      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-3 bg-white/60 dark:bg-black/40 p-3 rounded-2xl border border-gray-200 dark:border-white/10 backdrop-blur-md z-20 shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={t('adminList.searchAdmin')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 
                       bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white 
                       font-montserrat text-sm placeholder:text-gray-500 
                       focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
          />
        </div>

        {/* Filter */}
        <div className="relative min-w-[160px]" ref={filterDropdownRef}>
          <button
            onClick={() => setShowFilterDropdown(s => !s)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-xl border 
                       border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 
                       text-gray-900 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20
                       focus:outline-none transition-all"
          >
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span className="capitalize text-sm font-medium">
                {t(`adminList.${filterStatus}`)}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showFilterDropdown && (
            <div className="absolute top-full right-0 mt-2 w-full rounded-xl shadow-2xl z-50 
                           bg-white dark:bg-gray-900/95 border border-gray-200 dark:border-white/10 backdrop-blur-xl overflow-hidden">
              {STATUS_LABELS.map(st => (
                <button
                  key={st}
                  onClick={() => {
                    setFilterStatus(st);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                            ${filterStatus === st 
                              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {st === 'active' && <UserCheck size={14} />}
                  {st === 'suspended' && <UserX size={14} />}
                  {st === 'inactive' && <Lock size={14} />}
                  {st === 'all' && <Filter size={14} />}
                  <span className="capitalize">{t(`adminList.${st}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Table Section */}
      <div className="bg-white/60 dark:bg-black/50 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-white/20 shadow-xl overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={48} className="text-cyan-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('adminList.loading')}</p>
          </div>
        ) : error ? ( 
            <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400 gap-2">
              <Shield size={48} className="opacity-50" />
              <p className="text-lg font-medium">{error}</p>
            </div>
        ) : (
          <>
            {/* Header (Fixed) */}
            <div className="flex-shrink-0 overflow-y-hidden bg-gray-200 dark:bg-header-end-gray" style={{ scrollbarGutter: 'stable' }}>
              <table className="w-full table-fixed">
                <thead className="bg-gray-200 dark:bg-gradient-table-header dark:from-header-start-gray dark:to-header-end-gray text-black dark:text-white border-b border-gray-300 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[18%]">{t('adminList.name')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[22%]">{t('adminList.email')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[15%]">{t('adminList.phone')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[20%]">{t('adminList.createDate')}</th>
                    <th className="px-4 py-5 text-center text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[15%]">{t('adminList.status')}</th>
                    <th className="px-4 py-5 text-center text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[10%]">{t('adminList.action')}</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Body (Scrollable) */}
            <div className="overflow-y-scroll flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500" style={{ scrollbarGutter: 'stable' }}>
              <table className="w-full table-fixed">
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <SearchIcon size={48} className="opacity-20" />
                          <p>{t('adminList.noAdmins')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((admin, i) => (
                      <tr 
                        key={admin._id} 
                        className={`hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group ${i % 2 === 0 ? 'bg-gray-50 dark:bg-white/5' : 'bg-transparent'}`}
                      >
                        <td className="px-4 py-4 w-[18%]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
                              {admin.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-black dark:text-white font-bold text-sm truncate">{admin.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[22%]">
                          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300 text-sm truncate">
                            <Mail size={14} className="text-gray-600 dark:text-gray-500 shrink-0" />
                            <span className="truncate">{admin.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[15%]">
                          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300 text-sm truncate">
                            <Phone size={14} className="text-gray-600 dark:text-gray-500 shrink-0" />
                            <span className="truncate">{admin.phoneNumber || t('common.notAvailable')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[20%]">
                          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300 text-sm">
                            <Calendar size={14} className="text-gray-600 dark:text-gray-500 shrink-0" />
                            <span>{formatDate(admin.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[15%] text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusBadge(admin.accountStatus)}`}>
                            {t(`adminList.${admin.accountStatus}`)}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[10%] text-center">
                          <button
                            onClick={() => handleToggleStatus(admin._id, admin.accountStatus)}
                            disabled={togglingId === admin._id}
                            className={`p-2 rounded-lg transition-all duration-200 inline-flex
                                      ${togglingId === admin._id ? 'cursor-not-allowed opacity-50' : ''}
                                      ${admin.accountStatus === 'active' 
                                        ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300' 
                                        : 'text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-300'
                                      }`}
                            title={admin.accountStatus === 'active' ? t('alerts.suspendTitle') : t('alerts.activateTitle')}
                          >
                            {togglingId === admin._id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : admin.accountStatus === 'active' ? (
                              <Lock size={18} />
                            ) : (
                              <Unlock size={18} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      
    </motion.main>
  );
};

export default AdminList;