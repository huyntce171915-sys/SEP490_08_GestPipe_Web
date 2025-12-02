import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search as SearchIcon, Eye, Loader2, Layers, Calendar, Download, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import versionService from '../services/versionService';
import authService from '../services/authService'; 
import { useTheme } from '../utils/ThemeContext'; 

// ================== MAPPING UTILITY ==================
const getStatusBadge = (status) => {
  switch (status) {
    case "Release": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
    case "Stop": return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20";
    default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20";
  }
};

// ========= POPUP COMPONENT (Giữ nguyên) =========
const VersionDetailPopup = ({ show, detail, onClose }) => {
  const { t } = useTranslation();
  const { theme } = useTheme(); // Assuming useTheme is available or passed, but here it's not imported. I should import it or use props. 
  // Wait, VersionList uses useTheme? No, it doesn't import it. I should check if I can import it.
  // Looking at imports: import { useTheme } from '../utils/ThemeContext'; is missing.
  // I will add the import first.
  
  const formatNumber = (num) =>
    typeof num === "number" ? num.toLocaleString("vi-VN") : num || t('common.notAvailable');

  const formatDate = (dateStr) => {
    if (!dateStr) return t('common.notAvailable');
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? t('common.notAvailable') : d.toLocaleString("vi-VN", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAccuracy = (acc) => {
    if (acc === undefined || acc === null || acc === '') return t('common.notAvailable');
    if (typeof acc === 'string' && acc.includes('%')) return acc;
    return `${acc}%`;
  };

  const popupRef = useRef();
  useEffect(() => {
    if (!show) return;
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [show, onClose]);

  let descriptionText = '';
  let infoRows = [];

  if (detail) {
    if (typeof detail.description === 'string') {
      descriptionText = detail.description;
    } else {
      descriptionText = detail.description?.text || t('common.notAvailable');
    }
    infoRows = [
      { label: t('versionList.releaseName'), value: detail.releaseName },
      { label: t('versionList.version'), value: detail.version },
      { label: t('versionList.releaseDate'), value: formatDate(detail.releaseDate) },
      { label: t('versionList.numberOfDownloads'), value: formatNumber(detail.downloads) },
      { label: t('versionList.accuracy'), value: formatAccuracy(detail.accuracy) },
      { label: t('versionList.status'), value: t(`versionList.${detail.status}`) },
    ];
  }

  return (
    <div 
      className={`fixed z-[999] inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm font-montserrat 
                  transition-opacity duration-300 ease-in-out 
                  pl-72 
                  ${show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      <div
        ref={popupRef}
        className={`w-full max-w-[650px] rounded-2xl border px-5 py-7 relative
                    transition-all duration-300 ease-in-out
                    bg-white dark:bg-black border-gray-200 dark:border-white/10 shadow-2xl
                    ${show ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
        style={{
          minWidth: '340px',
          maxHeight: '90vh',
          overflow: 'hidden', 
        }}
      >
        {detail && (
          <>
            <div
              className="flex flex-col gap-4 pb-2 scrollbar-thin scrollbar-track-transparent 
                         scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500" 
              style={{ paddingLeft: 32, overflowY: "auto", maxHeight: '70vh' }}
            >
              {infoRows.map(({ label, value }, idx) => (
                <div
                  key={idx}
                  className="flex flex-row items-center"
                  style={{ minHeight: '32px' }}
                >
                  <span className="font-bold text-base text-black dark:text-white mr-2" style={{ minWidth: 210 }}>
                    {label}
                  </span>
                  <span className="text-gray-900 dark:text-white text-base font-normal break-words">
                    {value || t('common.notAvailable')}
                  </span>
                </div>
              ))}
              <div className="flex flex-row items-start pt-1">
                <span className="font-bold text-base text-black dark:text-white mr-2" style={{ minWidth: 210 }}>
                  {t('versionList.description')}
                </span>
                <div
                  className="text-gray-900 dark:text-white text-base font-normal flex-1 
                             scrollbar-thin scrollbar-track-transparent 
                             scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500
                             bg-gray-100 dark:bg-white/10 rounded px-2 py-1"
                  style={{
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    whiteSpace: 'pre-line',
                    maxHeight: '150px',
                    overflowY: 'auto',
                  }}
                >
                  <div>
                    {descriptionText}
                  </div>
                  {Array.isArray(detail.description?.features) && (
                    <ul className="text-gray-700 dark:text-white text-base mt-2 list-disc pl-5">
                      {detail.description.features.map((feat, idx) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <button
              className="block mx-auto mt-7 px-6 py-2 rounded-xl font-semibold text-base text-white shadow 
                         transition-all duration-200 ease-in-out
                         bg-gradient-to-r from-red-600 to-red-700 
                         hover:from-red-700 hover:to-red-800"
              style={{
                boxShadow: '0px 2px 6px rgba(130, 30, 30, 0.17)',
                width: '120px',
              }}
              onClick={onClose}
            >
              {t('versionList.close')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Biến cho hiệu ứng
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { type: 'tween', ease: 'easeOut', duration: 0.3 }
};


// ================== MAIN COMPONENT ==================
const VersionList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formatNumber = (num) =>
    typeof num === "number" ? num.toLocaleString("vi-VN") : num || t('common.notAvailable');

  const formatDate = (dateStr) => {
    if (!dateStr) return t('common.notAvailable');
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? t('common.notAvailable') : d.toLocaleString("vi-VN", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAccuracy = (acc) => {
    if (acc === undefined || acc === null || acc === '') return t('common.notAvailable');
    if (typeof acc === 'string' && acc.includes('%')) return acc;
    return `${acc}%`;
  };

  const [versions, setVersions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedVersionDetail, setSelectedVersionDetail] = useState(null);

  useEffect(() => {
    try {
      const currentAdmin = authService.getCurrentUser();
      if (!currentAdmin || !['admin', 'superadmin'].includes(currentAdmin.role)) {
        navigate("/");
      } else {
        fetchVersions();
      }
    } catch {
      navigate("/");
    }
  }, [navigate]);

  const fetchVersions = useCallback(async () => {
    setLoading(true); 
    try {
      const data = await versionService.fetchAllVersions();
      setVersions(Array.isArray(data) ? data : data.versions || []);
    } catch {
      toast.error(t('versionList.failedToLoadVersions'));
      setVersions([]);
    } finally {
      setLoading(false); 
    }
  }, []);

  const handleShowDetail = async (id) => {
    try {
      const detail = await versionService.fetchVersionById(id);
      setSelectedVersionDetail(detail);
      setShowDetailPopup(true);
    } catch {
      toast.error(t('versionList.cannotLoadVersionDetail'));
    }
  };

  const getVisibleVersions = useCallback(() => {
    return versions.filter((v) => {
      const keyword = searchTerm.toLowerCase();
      const matchSearch =
        (v.version?.toLowerCase().includes(keyword) ||
          v.release_name?.toLowerCase().includes(keyword));
      return matchSearch; 
    });
  }, [versions, searchTerm]);

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
            <Layers className="text-cyan-600 dark:text-cyan-400" size={32} />
            {t('versionList.title', { defaultValue: 'Version Management' })}
          </h1>
          <p className="text-gray-700 dark:text-gray-400 text-base font-medium">{t('versionList.subtitle', { defaultValue: 'Manage system versions and releases' })}</p>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-3 bg-white/60 dark:bg-black/40 p-3 rounded-2xl border border-gray-200 dark:border-white/10 backdrop-blur-md z-20 shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={t('versionList.searchVersion')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 
                       bg-gray-100 dark:bg-white/5 text-black dark:text-white 
                       font-montserrat text-sm placeholder:text-gray-600 
                       focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
          />
        </div>
      </div>
      
      {/* Table Section */}
      <div className="bg-white/60 dark:bg-black/50 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-white/20 shadow-xl overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={48} className="text-cyan-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('versionList.loadingVersions')}</p>
          </div>
        ) : (
          <>
            {/* Header (Fixed) */}
            <div className="flex-shrink-0 overflow-y-hidden bg-gray-200 dark:bg-header-end-gray" style={{ scrollbarGutter: 'stable' }}>
              <table className="w-full table-fixed">
                <thead className="bg-gray-200 dark:bg-gradient-table-header dark:from-header-start-gray dark:to-header-end-gray text-black dark:text-white border-b border-gray-300 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[13%]">{t('versionList.versionHeader')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[16%]">{t('versionList.releaseNameHeader')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[20%]">{t('versionList.releaseDateHeader')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[14%]">{t('versionList.downloadsHeader')}</th>
                    <th className="px-4 py-5 text-left text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[14%]">{t('versionList.accuracyHeader')}</th>
                    <th className="px-4 py-5 text-center text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[13%]">{t('versionList.statusHeader')}</th>
                    <th className="px-4 py-5 text-center text-sm font-extrabold uppercase tracking-wider whitespace-nowrap w-[10%]">{t('versionList.actionHeader')}</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Body (Scrollable) */}
            <div className="overflow-y-scroll flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500" style={{ scrollbarGutter: 'stable' }}>
              <table className="w-full table-fixed">
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {getVisibleVersions().length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <SearchIcon size={48} className="opacity-20" />
                          <p>{t('versionList.noVersionsFound')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getVisibleVersions().map((v, i) => (
                      <tr 
                        key={v._id || v.id || i} 
                        className={`hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group ${i % 2 === 0 ? 'bg-gray-50 dark:bg-white/5' : 'bg-transparent'}`}
                      >
                        <td className="px-4 py-4 w-[13%]">
                          <span className="text-black dark:text-white font-bold text-sm">{v.version}</span>
                        </td>
                        <td className="px-4 py-4 w-[16%]">
                          <span className="text-gray-800 dark:text-gray-300 font-medium text-sm truncate block">{v.release_name}</span>
                        </td>
                        <td className="px-4 py-4 w-[20%]">
                          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300 text-sm">
                            <Calendar size={14} className="text-gray-600 dark:text-gray-500 shrink-0" />
                            <span>{formatDate(v.release_date)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[14%]">
                          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300 text-sm truncate">
                            <Download size={14} className="text-gray-600 dark:text-gray-500 shrink-0" />
                            <span className="truncate">{formatNumber(v.downloads)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[14%]">
                          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300 text-sm truncate">
                            <Activity size={14} className="text-gray-600 dark:text-gray-500 shrink-0" />
                            <span className="truncate">{formatAccuracy(v.accuracy)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-[13%] text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusBadge(v.status)}`}>
                            {t(`versionList.${v.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-[10%] text-center">
                          <button
                            onClick={() => handleShowDetail(v._id || v.id)}
                            className="p-2 rounded-lg transition-all duration-200 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300"
                            title={t('versionList.viewDetails')}
                          >
                            <Eye size={18} />
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
      
      {/* POPUP Chi tiết (LUÔN RENDER) */}
      <VersionDetailPopup
        show={showDetailPopup}
        detail={selectedVersionDetail}
        onClose={() => setShowDetailPopup(false)}
      />
    </motion.main>
  );
};

export default VersionList;