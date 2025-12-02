
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Search as SearchIcon,
  X,
  ChevronDown,
  Layers,
  Zap,
  Activity,
  Database,
  Filter,
  Settings
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AnimatePresence, motion } from 'framer-motion'; 

import CameraPreview from '../components/CameraPreview'; // <-- ĐÃ THÊM LẠI
import GesturePracticeML from '../components/GesturePracticeML';
import GestureCustomization from '../components/GestureCustomization';
import { useTheme } from '../utils/ThemeContext';
import authService from '../services/authService';
import {
  fetchGestures,
  fetchGestureLabels,
  fetchGestureStats,
  getModelStatus,
  getModelInfo,
  testModel,
  getGestureStatusesOfAdmin,
  submitGestureForApproval,
  sendToDrive,
} from '../services/gestureService';

const LIMIT = 20;
const STATIC_THRESHOLD = 0.02;
const FINGER_KEYS = ['fingerThumb', 'fingerIndex', 'fingerMiddle', 'fingerRing', 'fingerPinky'];

// ... (Component InstructionModal giữ nguyên) ...
const InstructionModal = ({ open, gesture, instruction, onClose, theme, t }) => {
  return (
    <AnimatePresence>
      {open && gesture && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-6 pl-72"> 
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={`relative w-full max-w-2xl rounded-2xl border bg-white/90 dark:bg-black/80 border-gray-200 dark:border-white/20 text-black dark:text-white shadow-2xl backdrop-blur-lg`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className={`flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-white/20`}>
              <div>
                <p className="text-sm uppercase tracking-wide text-cyan-600 dark:text-cyan-400 font-semibold"> 
                  {gesture.gesture_type === 'static'
                    ? t('gestures.modalStatic', { defaultValue: 'Static gesture' })
                    : t('gestures.modalDynamic', { defaultValue: 'Dynamic gesture' })}
                </p>
                <h2 className="text-2xl font-semibold capitalize">{gesture.pose_label}</h2>
              </div>
              <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300`} aria-label={t('gestures.modalClose', { defaultValue: 'Close' })}>
                <X size={22} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <section>
                <h3 className={`text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-gray-400`}>
                  {t('gestures.modalInstruction', { defaultValue: 'Instruction' })}
                </h3>
                <p className="mt-2 leading-relaxed">{instruction}</p>
              </section>
              <section className={`rounded-xl border px-4 py-3 border-gray-200 dark:border-white/20 bg-gray-100 dark:bg-black/30`}>
                <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 text-gray-800 dark:text-gray-400`}>
                  {t('gestures.modalMeta', { defaultValue: 'Motion summary' })}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="font-medium">{t('gestures.modalDelta', { defaultValue: 'Δx / Δy:' })}{' '}</span>
                    {`${Number(gesture.delta_x || 0).toFixed(3)}, ${Number(gesture.delta_y || 0).toFixed(3)}`}
                  </p>
                  <p>
                    <span className="font-medium">{t('gestures.modalMainAxis', { defaultValue: 'Main axis:' })}{' '}</span>
                    {`${gesture.main_axis_x}, ${gesture.main_axis_y}`}
                  </p>
                </div>
              </section>
            </div>
            <div className={`flex justify-end px-6 py-4 border-t border-gray-200 dark:border-white/20`}>
              <button type="button" onClick={onClose} className={`px-6 py-2 rounded-lg font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}>
                {t('gestures.modalClose', { defaultValue: 'Close' })}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
// ... (Các hàm describeMotion, buildInstruction giữ nguyên) ...
const describeMotion = (gesture, t) => {
  const dx = Number(gesture.delta_x) || 0;
  const dy = Number(gesture.delta_y) || 0;
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude <= STATIC_THRESHOLD) {
    return t('gestures.instructionStatic', { defaultValue: 'Hold steady for about one second.' });
  }
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);
  if (isHorizontal) {
    if (dx > 0) { return t('gestures.instructionMoveRight', { defaultValue: 'Sweep the hand to the right.' }); }
    if (dx < 0) { return t('gestures.instructionMoveLeft', { defaultValue: 'Sweep the hand to the left.' }); }
    return t('gestures.instructionHorizontal', { defaultValue: 'Perform a horizontal sweep.' });
  }
  if (dy > 0) { return t('gestures.instructionMoveDown', { defaultValue: 'Move the hand downward.' }); }
  if (dy < 0) { return t('gestures.instructionMoveUp', { defaultValue: 'Move the hand upward.' }); }
  return t('gestures.instructionVertical', { defaultValue: 'Perform a vertical sweep.' });
};
const buildInstruction = (gesture, t) => {
  const leftHand = t('gestures.instructionLeft', { defaultValue: 'Close your left fist to start recording, then open it to finish.' });
  const fingerNames = ['thumb', 'index finger', 'middle finger', 'ring finger', 'pinky finger'];
  const openFingers = [];
  const closedFingers = [];

  FINGER_KEYS.forEach((key, index) => {
    const isOpen = Number(gesture[`right_finger_state_${index}`]) === 1;
    if (isOpen) {
      openFingers.push(fingerNames[index]);
    } else {
      closedFingers.push(fingerNames[index]);
    }
  });

  let rightHand = 'Right hand: ';
  if (openFingers.length > 0) {
    rightHand += `Keep ${openFingers.join(', ')} extended. `;
  }
  if (closedFingers.length > 0) {
    rightHand += `Keep ${closedFingers.join(', ')} closed. `;
  }

  const motion = describeMotion(gesture, t);
  return `${leftHand} ${rightHand}${motion}`;
};

// Hiệu ứng
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { type: 'tween', ease: 'easeOut', duration: 0.3 }
};


const Gestures = ({ showCustomTab = false }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // (State giữ nguyên)
  const [gestures, setGestures] = useState([]);
  const [labels, setLabels] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    limit: LIMIT,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeGesture, setActiveGesture] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [showMLPractice, setShowMLPractice] = useState(false);
  const [selectedPracticeGesture, setSelectedPracticeGesture] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedCustomGesture, setSelectedCustomGesture] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [gestureStatuses, setGestureStatuses] = useState([]);
  const [canCustom, setCanCustom] = useState(true);
  const [cooldownEndTime, setCooldownEndTime] = useState(null);
  const [sendToDriveLoading, setSendToDriveLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [selectedInstructionGesture, setSelectedInstructionGesture] = useState(null);
  const [instructionText, setInstructionText] = useState('');
  
  const labelDropdownRef = useRef();
  const typeDropdownRef = useRef();
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // (useEffect và logic giữ nguyên)
  useEffect(() => {
    const currentAdmin = authService.getCurrentUser();
    if (!currentAdmin) {
      navigate('/');
      return;
    }
    setAdmin(currentAdmin);
  }, [navigate]);

  // Define loadGestureStatuses function
  const loadGestureStatuses = useCallback(async () => {
    if (!admin || admin.role !== 'admin') return;

    try {
      const response = await getGestureStatusesOfAdmin(admin.id || admin._id);
      if (response.success) {
        setGestureStatuses(response.data.requests);
        setCanCustom(response.data.canCustom);
      }
    } catch (error) {
      console.warn('Failed to load gesture statuses:', error);
      setGestureStatuses([]);
      setCanCustom(true);
    }
  }, [admin]);

  // Load gesture statuses when admin changes
  useEffect(() => {
    loadGestureStatuses();
  }, [loadGestureStatuses]);

  // Load pending requests for superadmin
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!admin || admin.role !== 'superadmin') return;

      try {
        setRequestsLoading(true);
        // TODO: Implement fetchCustomizationRequests if needed
        // const response = await fetchCustomizationRequests('pending');
        // setRequests(response || []);
        setRequests([]);
      } catch (error) {
        console.warn('Failed to load pending requests:', error);
        setRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    loadPendingRequests();
  }, [admin]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [labelsResponse, statsResponse, modelStatusResponse, modelInfoResponse] = await Promise.all([
          fetchGestureLabels(),
          fetchGestureStats(),
          getModelStatus(),
          getModelInfo().catch(() => null),
        ]);
        setLabels(labelsResponse);
        setStats(statsResponse);
        setModelStatus(modelStatusResponse);
        setModelInfo(modelInfoResponse);
      } catch (err) {
        console.error(err);
        toast.error(
          err.response?.data?.message ||
            t('gestures.toastFailedLoadMeta', {
              defaultValue: 'Failed to load gesture metadata',
            })
        );
      }
    };
    loadMetadata();
  }, [t]);

  useEffect(() => {
    const loadGestures = async () => {
      try {
        setLoading(true);
        const response = await fetchGestures({
          page: pagination.page,
          limit: LIMIT,
          poseLabel: selectedLabel === 'all' ? undefined : selectedLabel,
          gestureType: selectedType,
        });
        setGestures(response.data || []);
        setPagination(response.pagination);
        setError('');
      } catch (err) {
        console.error(err);
        const message =
          err.response?.data?.message ||
          t('gestures.toastFailedLoadGestures', {
            defaultValue: 'Failed to load gestures',
          });
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    loadGestures();
  }, [selectedLabel, selectedType, pagination.page, t]);

  // Handle cooldown timer for Send to Drive
  useEffect(() => {
    if (cooldownEndTime) {
      const interval = setInterval(() => {
        if (new Date() >= cooldownEndTime) {
          setCanCustom(true);
          setCooldownEndTime(null);
          toast.success('You can now customize gestures again');
        }
      }, 1000); // Check every second

      return () => clearInterval(interval);
    }
  }, [cooldownEndTime]);
  
  const filteredGestures = useMemo(() => {
    if (!searchTerm.trim()) {
      return gestures;
    }
    const query = searchTerm.trim().toLowerCase();
    return gestures.filter((gesture) => {
      const idMatch = String(gesture.instance_id).includes(query);
      const labelMatch = String(gesture.pose_label)
        .toLowerCase()
        .includes(query);
      return idMatch || labelMatch;
    });
  }, [gestures, searchTerm]);
  const totalGestures = useMemo(() => {
    if (stats?.types) {
      return (stats.types.static || 0) + (stats.types.dynamic || 0);
    }
    if (stats?.counts?.length) {
      return stats.counts.reduce((sum, row) => sum + (row.samples || 0), 0);
    }
    return pagination.total || 0;
  }, [stats, pagination.total]);
  const uniquePoses = useMemo(() => {
    if (stats?.counts?.length) {
      return stats.counts.length;
    }
    return labels.length;
  }, [stats, labels]);
  const staticCount = stats?.types?.static || 0;
  const dynamicCount = stats?.types?.dynamic || 0;
  const averageMotion = useMemo(() => {
    if (stats?.motion?.avg_delta_x && stats?.motion?.avg_delta_y) {
      return `${Number(stats.motion.avg_delta_x).toFixed(3)}, ${Number(stats.motion.avg_delta_y).toFixed(3)}`;
    }
    return '0.000, 0.000';
  }, [stats]);
  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < (pagination.pages || 1);

  const handleChangeLabel = (label) => {
    setSelectedLabel(label);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setShowLabelDropdown(false);
  };
  const handleChangeType = (type) => {
    setSelectedType(type);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setShowTypeDropdown(false);
  };
  const handleMLPractice = (gestureLabel) => {
    setSelectedPracticeGesture(gestureLabel);
    setShowMLPractice(true);
  };
  const handleCustomGesture = (gesture) => {
    setSelectedCustomGesture(gesture);
    setShowCustomModal(true);
  };
  const getGestureStatus = (gestureName) => {
    const status = gestureStatuses.find(g => g.gestureId === gestureName);
    console.log(`getGestureStatus(${gestureName}):`, status ? status.status : 'not found, defaulting to ready');
    return status ? status.status : 'ready'; // Default to 'ready' if not found
  };

  const handleSendToDrive = async () => {
    try {
      setSendToDriveLoading(true);
      toast.info('Sending files to Drive, please wait...');

      const response = await sendToDrive();
      if (response.success) {
        toast.success('Successfully sent to Drive, please wait 15 minutes before continuing to customize');

        // Set cooldown period - disable custom buttons for 15 minutes
        setCanCustom(false);
        setCooldownEndTime(new Date(Date.now() + 15 * 60 * 1000)); // 15 minutes from now

        // Refresh gesture statuses after submission
        const updatedStatuses = await getGestureStatusesOfAdmin(admin.id || admin._id);
        if (updatedStatuses.success) {
          setGestureStatuses(updatedStatuses.data.requests);
        }
      } else {
        toast.error(response.message || 'Failed to send to Drive');
      }
    } catch (error) {
      console.error('Error sending to Drive:', error);
      toast.error('Error sending to Drive');
    } finally {
      setSendToDriveLoading(false);
    }
  };

  const openInstructionModal = (gesture) => {
    setSelectedInstructionGesture(gesture);
    setInstructionText(buildInstruction(gesture, t));
    setShowInstructionModal(true);
  };

  const closeInstructionModal = () => {
    setShowInstructionModal(false);
    setSelectedInstructionGesture(null);
    setInstructionText('');
  };

  // Define tabs - Only Overview and Custom for admin
  const tabs = [
    { id: 'overview', label: t('gestures.overview', { defaultValue: 'Overview' }), icon: Database },
    // Add Custom tab for admin only (not superadmin)
    ...(admin?.role === 'admin' ? [{ id: 'custom', label: 'Custom', icon: Settings }] : [])
  ];

  return (
    // ===== SỬA LỖI SCROLL: Bỏ overflow-hidden, Bỏ flex-col =====
    <motion.main 
      className="flex-1 overflow-y-auto p-6 md:p-8 font-montserrat flex flex-col gap-6" // <-- Updated layout
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageVariants.transition}
    >
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black dark:text-white mb-2">{t('gestures.title', { defaultValue: 'Gestures Management' })}</h1>
          <p className="text-gray-700 dark:text-gray-400 text-base font-medium">{t('gestures.subtitle', { defaultValue: 'Manage and monitor system gestures' })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* BỐ CỤC 2 CỘT (CAMERA | STATS) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Cột 1: Camera (Style "kính mờ") - Chiếm 1/2 */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg overflow-hidden p-1 h-full min-h-[400px]">
              <div className="rounded-xl overflow-hidden h-full border border-gray-200 dark:border-white/5 relative">
                 <CameraPreview theme={theme} />
              </div>
            </div>
            
            {/* Cột 2: Stats (List Style) - Chiếm 1/2 */}
            <div className="flex flex-col gap-4">
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-5 flex-1 flex flex-col justify-center">
                 <h3 className="text-gray-700 dark:text-gray-400 text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Database size={16} className="text-cyan-700 dark:text-cyan-500" /> {t('gestures.systemOverview')}
                 </h3>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <span className="text-gray-800 dark:text-gray-300 text-sm font-medium">{t('gestures.statTotal', { defaultValue: 'Total samples' })}</span>
                       <span className="text-2xl font-extrabold text-black dark:text-white">{totalGestures}</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-white/10"></div>
                    <div className="flex items-center justify-between">
                       <span className="text-gray-600 dark:text-gray-300 text-sm">{t('gestures.statUnique', { defaultValue: 'Unique poses' })}</span>
                       <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{uniquePoses}</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-white/10"></div>
                    <div className="flex items-center justify-between">
                       <span className="text-gray-600 dark:text-gray-300 text-sm">{t('gestures.statStatic', { defaultValue: 'Static samples' })}</span>
                       <span className="text-2xl font-bold text-green-600 dark:text-green-400">{staticCount}</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-white/10"></div>
                    <div className="flex items-center justify-between">
                       <span className="text-gray-600 dark:text-gray-300 text-sm">{t('gestures.statDynamic', { defaultValue: 'Dynamic samples' })}</span>
                       <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dynamicCount}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* KHỐI FILTER + SEARCH */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5 backdrop-blur-sm relative z-30">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative" ref={labelDropdownRef}>
                  <button
                    onClick={() => setShowLabelDropdown(s => !s)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border 
                               border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40 backdrop-blur-sm 
                               text-gray-900 dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-cyan-500/50 
                               focus:outline-none focus:border-cyan-500/50 transition text-sm font-medium"
                  >
                    <Filter size={16} className="text-cyan-600 dark:text-cyan-500" />
                    <span className="capitalize">
                      {selectedLabel === "all" ? t('gestures.allGestures', { defaultValue: 'All Gestures' }) : selectedLabel}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  
                  {showLabelDropdown && (
                    <div
                      className="absolute top-full mt-2 w-64 rounded-xl shadow-2xl z-50 
                                 bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 overflow-hidden
                                 max-h-60 overflow-y-auto 
                                 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600"
                    >
                      <button
                        key="all"
                        onClick={() => handleChangeLabel('all')}
                        className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm
                                   hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5 last:border-0"
                      >
                        {t('gestures.allGestures', { defaultValue: 'All Gestures' })}
                      </button>
                      {labels.map(st => (
                        <button
                          key={st}
                          onClick={() => handleChangeLabel(st)}
                          className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm
                                     hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5 last:border-0"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    onClick={() => setShowTypeDropdown(s => !s)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border 
                               border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40 backdrop-blur-sm 
                               text-gray-900 dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-cyan-500/50 
                               focus:outline-none focus:border-cyan-500/50 transition text-sm font-medium"
                  >
                    <Activity size={16} className="text-cyan-600 dark:text-cyan-500" />
                    <span className="capitalize">
                      {selectedType === "all" 
                        ? t('gestures.allTypes', { defaultValue: 'All Types' }) 
                        : (selectedType === 'static' ? t('gestures.typeStatic', { defaultValue: 'Static' }) : t('gestures.typeDynamic', { defaultValue: 'Dynamic' }))}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  
                  {showTypeDropdown && (
                    <div
                      className="absolute top-full mt-2 w-48 rounded-xl shadow-2xl z-50 
                                 bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 overflow-hidden"
                    >
                      <button onClick={() => handleChangeType('all')} className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5">
                        {t('gestures.allTypes', { defaultValue: 'All Types' })}
                      </button>
                      <button onClick={() => handleChangeType('static')} className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5">
                        {t('gestures.typeStatic', { defaultValue: 'Static' })}
                      </button>
                      <button onClick={() => handleChangeType('dynamic')} className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors">
                        {t('gestures.typeDynamic', { defaultValue: 'Dynamic' })}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative w-full md:max-w-xs">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={t('gestures.searchPlaceholder', { defaultValue: 'Search gesture...' })}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 
                             bg-gray-100 dark:bg-black/40 backdrop-blur-sm text-gray-900 dark:text-white 
                             font-montserrat text-sm placeholder:text-gray-500 
                             focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 dark:focus:bg-black/60 transition-all"
                />
              </div>
          </div>
          
          {/* CONTAINER BẢNG */}
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
                  {t('gestures.listTitle', { defaultValue: 'Gesture List' })}
               </h3>
               <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('gestures.statAverageMotion', {
                    defaultValue: 'Avg Δ (x, y): {{value}}',
                    value: averageMotion,
                  })}
               </p>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Loader2 size={48} className="text-cyan-500 animate-spin" />
                <p className="text-lg font-medium text-cyan-500 mt-4">{t('gestures.loading')}</p>
              </div>
            ) : error ? ( 
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <p className="text-lg font-medium text-red-500 dark:text-red-400">{error}</p>
                </div>
            ) : (
              <>
                {/* Div cho Header */}
                <div>
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-200 dark:bg-white/5 text-black dark:text-gray-300 border-b border-gray-300 dark:border-white/10">
                      <tr>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[25%]">{t('gestures.poseLabel', { defaultValue: 'Pose Label' })}</th>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[15%]">{t('gestures.columnType', { defaultValue: 'Type' })}</th>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[45%]">{t('gestures.columnInstruction', { defaultValue: 'Instruction' })}</th>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[15%]">{t('gestures.columnActions', { defaultValue: 'Actions' })}</th>
                      </tr>
                    </thead>
                  </table>
                </div>
                
                {/* Div cho Body */}
                <div>
                  <table className="w-full table-fixed">
                    <tbody className="font-montserrat">
                      {filteredGestures.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-gray-500">
                            {t('gestures.empty', { defaultValue: 'No gestures found' })}
                          </td>
                        </tr>
                      ) : (
                        filteredGestures.map((gesture, i) => (
                          <tr 
                            key={`${gesture.pose_label}-${gesture.instance_id}`} 
                            className={`border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors
                                        ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'}`}
                          >
                            <td className="px-6 py-4 font-bold text-black dark:text-white text-sm capitalize truncate w-[25%]">
                              {gesture.pose_label}
                            </td>
                            <td className="px-6 py-4 text-sm w-[15%]">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                gesture.gesture_type === 'static' 
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' 
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              }`}>
                                {gesture.gesture_type === 'static'
                                  ? t('gestures.typeStatic', { defaultValue: 'Static' })
                                  : t('gestures.typeDynamic', { defaultValue: 'Dynamic' })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-800 dark:text-gray-400 text-sm truncate w-[45%]" title={buildInstruction(gesture, t)}>
                              {buildInstruction(gesture, t)}
                            </td>
                            <td className="px-6 py-4 w-[15%]">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMLPractice(gesture.pose_label)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                              bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30
                                              hover:bg-cyan-500/30 hover:text-cyan-700 dark:hover:text-cyan-300`}
                                >
                                  {t('gestures.practiceButton', { defaultValue: 'Practice' })}
                                </button>
                                <button
                                  onClick={() => openInstructionModal(gesture)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                              bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10
                                              hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white`}
                                >
                                  {t('gestures.viewButton', { defaultValue: 'View' })}
                                </button>
                              </div>
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

          {/* Send to Drive Button */}
          {admin?.role === 'admin' && gestureStatuses.some(g => g.status === 'customed') && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleSendToDrive}
                disabled={sendToDriveLoading}
                className={`px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  sendToDriveLoading
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {sendToDriveLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {sendToDriveLoading ? 'Sending to Drive...' : `Send to Drive (${gestureStatuses.filter(g => g.status === 'customed').length} customized)`}
              </button>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                disabled={!canGoPrev}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors
                             ${canGoPrev
                               ? 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                               : 'border-gray-200 dark:border-white/5 bg-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                             }`}
              >
                {t('gestures.prev', { defaultValue: 'Previous' })}
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.page + 1, prev.pages || 1) }))}
                disabled={!canGoNext}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors
                             ${canGoNext
                               ? 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                               : 'border-gray-200 dark:border-white/5 bg-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                             }`}
              >
                {t('gestures.next', { defaultValue: 'Next' })}
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'custom' && admin?.role === 'admin' && (
        <>
          {/* KHỐI FILTER + SEARCH - Giữ nguyên */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5 backdrop-blur-sm relative z-30">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative" ref={labelDropdownRef}>
                  <button
                    onClick={() => setShowLabelDropdown(s => !s)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border 
                               border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40 backdrop-blur-sm 
                               text-gray-900 dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-cyan-500/50 
                               focus:outline-none focus:border-cyan-500/50 transition text-sm font-medium"
                  >
                    <Filter size={16} className="text-cyan-600 dark:text-cyan-500" />
                    <span className="capitalize">
                      {selectedLabel === "all" ? t('gestures.allGestures', { defaultValue: 'All Gestures' }) : selectedLabel}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  
                  {showLabelDropdown && (
                    <div
                      className="absolute top-full mt-2 w-64 rounded-xl shadow-2xl z-50 
                                 bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 overflow-hidden
                                 max-h-60 overflow-y-auto 
                                 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600"
                    >
                      <button
                        key="all"
                        onClick={() => handleChangeLabel('all')}
                        className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm
                                   hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5 last:border-0"
                      >
                        {t('gestures.allGestures', { defaultValue: 'All Gestures' })}
                      </button>
                      {labels.map(st => (
                        <button
                          key={st}
                          onClick={() => handleChangeLabel(st)}
                          className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm
                                     hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5 last:border-0"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    onClick={() => setShowTypeDropdown(s => !s)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border 
                               border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40 backdrop-blur-sm 
                               text-gray-900 dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-cyan-500/50 
                               focus:outline-none focus:border-cyan-500/50 transition text-sm font-medium"
                  >
                    <Activity size={16} className="text-cyan-600 dark:text-cyan-500" />
                    <span className="capitalize">
                      {selectedType === "all" 
                        ? t('gestures.allTypes', { defaultValue: 'All Types' }) 
                        : (selectedType === 'static' ? t('gestures.typeStatic', { defaultValue: 'Static' }) : t('gestures.typeDynamic', { defaultValue: 'Dynamic' }))}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  
                  {showTypeDropdown && (
                    <div
                      className="absolute top-full mt-2 w-48 rounded-xl shadow-2xl z-50 
                                 bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 overflow-hidden"
                    >
                      <button onClick={() => handleChangeType('all')} className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5">
                        {t('gestures.allTypes', { defaultValue: 'All Types' })}
                      </button>
                      <button onClick={() => handleChangeType('static')} className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors border-b border-gray-200 dark:border-white/5">
                        {t('gestures.typeStatic', { defaultValue: 'Static' })}
                      </button>
                      <button onClick={() => handleChangeType('dynamic')} className="w-full text-left px-4 py-3 text-gray-900 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-white/5 capitalize transition-colors">
                        {t('gestures.typeDynamic', { defaultValue: 'Dynamic' })}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative w-full md:max-w-xs">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={t('gestures.searchPlaceholder', { defaultValue: 'Search gesture...' })}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 
                             bg-gray-100 dark:bg-black/40 backdrop-blur-sm text-gray-900 dark:text-white 
                             font-montserrat text-sm placeholder:text-gray-500 
                             focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 dark:focus:bg-black/60 transition-all"
                />
              </div>
          </div>
          
          {/* CONTAINER BẢNG - Chỉ 14 gestures, nút Practice thành Custom */}
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
                  Custom Gestures
               </h3>
               <p className="text-sm text-gray-500 dark:text-gray-400">
                  Customize existing gestures for your needs
               </p>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Loader2 size={48} className="text-cyan-500 animate-spin" />
                <p className="text-lg font-medium text-cyan-500 mt-4">{t('gestures.loading')}</p>
              </div>
            ) : error ? ( 
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <p className="text-lg font-medium text-red-500 dark:text-red-400">{error}</p>
                </div>
            ) : (
              <>
                {/* Div cho Header */}
                <div>
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-200 dark:bg-white/5 text-black dark:text-gray-300 border-b border-gray-300 dark:border-white/10">
                      <tr>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[25%]">{t('gestures.poseLabel', { defaultValue: 'Pose Label' })}</th>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[25%]">{t('gestures.columnType', { defaultValue: 'Type' })}</th>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[25%]">Status</th>
                        <th className="px-6 py-4 font-montserrat font-extrabold text-left text-sm uppercase tracking-wider w-[25%]">Actions</th>
                      </tr>
                    </thead>
                  </table>
                </div>
                
                {/* Div cho Body - Chỉ hiển thị 14 gestures đầu tiên */}
                <div>
                  <table className="w-full table-fixed">
                    <tbody className="font-montserrat">
                      {filteredGestures.slice(0, 14).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-gray-500">
                            {t('gestures.empty', { defaultValue: 'No gestures found' })}
                          </td>
                        </tr>
                      ) : (
                        filteredGestures.slice(0, 14).map((gesture, i) => (
                          <tr 
                            key={`${gesture.pose_label}-${gesture.instance_id}`} 
                            className={`border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors
                                        ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'}`}
                          >
                            <td className="px-6 py-4 font-bold text-black dark:text-white text-sm capitalize truncate w-[25%]">
                              {gesture.pose_label}
                            </td>
                            <td className="px-6 py-4 text-sm w-[25%]">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                gesture.gesture_type === 'static' 
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' 
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              }`}>
                                {gesture.gesture_type === 'static'
                                  ? t('gestures.typeStatic', { defaultValue: 'Static' })
                                  : t('gestures.typeDynamic', { defaultValue: 'Dynamic' })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm w-[25%]">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getGestureStatus(gesture.pose_label) === 'ready'
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                  : getGestureStatus(gesture.pose_label) === 'customed'
                                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              }`}>
                                {getGestureStatus(gesture.pose_label) === 'ready'
                                  ? 'Ready'
                                  : getGestureStatus(gesture.pose_label) === 'customed'
                                    ? 'Customized'
                                    : 'Blocked'}
                              </span>
                            </td>
                            <td className="px-6 py-4 w-[25%]">
                              <button
                                type="button"
                                onClick={() => handleCustomGesture(gesture)}
                                disabled={getGestureStatus(gesture.pose_label) !== 'ready' || !canCustom}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                            ${getGestureStatus(gesture.pose_label) === 'ready' && canCustom
                                              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:text-purple-700 dark:hover:text-purple-300'
                                              : 'bg-gray-400/20 text-gray-500 border border-gray-400/30 cursor-not-allowed'
                                            }`}
                              >
                                {getGestureStatus(gesture.pose_label) === 'customed' 
                                  ? 'Customized' 
                                  : getGestureStatus(gesture.pose_label) === 'blocked'
                                    ? (!canCustom && cooldownEndTime ? `Wait ${Math.ceil((cooldownEndTime - new Date()) / 1000 / 60)}m` : 'Blocked')
                                    : !canCustom && cooldownEndTime
                                      ? `Wait ${Math.ceil((cooldownEndTime - new Date()) / 1000 / 60)}m`
                                      : 'Custom'}
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
        </>
      )}

      {/* Send to Drive Button - Show when there are customized gestures */}
      {admin?.role === 'admin' && gestureStatuses.some(g => g.status === 'customed') && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSendToDrive}
            disabled={sendToDriveLoading}
            className={`px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              sendToDriveLoading
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {sendToDriveLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {sendToDriveLoading ? 'Sending to Drive...' : `Send to Drive (${gestureStatuses.filter(g => g.status === 'customed').length} customized)`}
          </button>
        </div>
      )}

      <InstructionModal
        open={showInstructionModal}
        gesture={selectedInstructionGesture}
        instruction={instructionText}
        onClose={closeInstructionModal}
        theme={theme}
        t={t}
      />

      {/* ML Practice Component */}
      {showMLPractice && selectedPracticeGesture && (
        <GesturePracticeML
          gestureName={selectedPracticeGesture}
          theme="dark"
          onClose={() => {
            setShowMLPractice(false);
            setSelectedPracticeGesture(null);
          }}
        />
      )}

      {/* Custom Gesture Modal */}
      {showCustomModal && selectedCustomGesture && (
        <GestureCustomization
          gestureName={selectedCustomGesture.pose_label}
          admin={admin}
          onClose={() => {
            setShowCustomModal(false);
            setSelectedCustomGesture(null);
          }}
          onCompleted={(gestureData) => {
            console.log('Custom gesture completed:', gestureData);
            toast.success(`Custom gesture "${gestureData.gestureName}" completed!`);
            // Refresh gesture statuses after successful customization
            loadGestureStatuses();
            setShowCustomModal(false);
            setSelectedCustomGesture(null);
          }}
          theme={theme}
        />
      )}
    </motion.main>
  );
};

export default Gestures;
