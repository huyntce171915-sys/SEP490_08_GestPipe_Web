import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dashboardService from '../services/dashboardService'; 
import { toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';
import authService from '../services/authService';
import { useTheme } from '../utils/ThemeContext';
import { 
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  CartesianGrid, Legend, AreaChart, Area 
} from "recharts";
import { motion } from 'framer-motion'; 
import { 
  Loader2, Users, Activity, MessageSquare, Clock, CheckCircle, 
  MapPin, Briefcase, Zap, Layers, GitBranch, Calendar 
} from 'lucide-react';

// Hiệu ứng
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { type: 'tween', ease: 'easeOut', duration: 0.3 }
};

// Màu sắc biểu đồ
const COLORS = {
  primary: "#06b6d4", // cyan-500
  secondary: "#3b82f6", // blue-500
  success: "#22c55e", // green-500
  warning: "#eab308", // yellow-500
  danger: "#ef4444", // red-500
  info: "#8b5cf6", // violet-500
  chart: ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981"]
};

// ====================================================================
// COMPONENT CHÍNH: Dashboard
// ====================================================================
const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useTheme(); 
  const [activeTab, setActiveTab] = useState('userOverview');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const adminData = authService.getCurrentUser();
    if (!adminData || adminData.role !== 'superadmin') {
      navigate('/user-list'); 
      return;
    }
  }, [navigate]);

  const TABS = [
    { key: 'userOverview', icon: Users },
    { key: 'gesture', icon: Zap },
    { key: 'version', icon: GitBranch }
  ];

  return (
    <motion.main 
      className="flex-1 overflow-y-auto p-6 md:p-8 font-montserrat flex flex-col gap-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-black dark:text-white mb-2">{t('dashboard.title', { defaultValue: 'Dashboard' })}</h1>
          <p className="text-gray-700 dark:text-gray-400 text-base font-medium">{t('dashboard.subtitle', { defaultValue: 'Welcome back to GestPipe Admin Dashboard' })}</p>
        </div>
        
        <div className="flex bg-white/60 dark:bg-black/40 p-1 rounded-xl backdrop-blur-md border border-gray-200 dark:border-white/10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${activeTab === tab.key
                    ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500/30" 
                    : "text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
              >
                <Icon size={16} />
                {t(`dashboard.${tab.key}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'userOverview' && <UserOverviewTab theme={theme} />}
        {activeTab === 'gesture' && <GestureTab theme={theme} />}
        {activeTab === 'version' && <VersionTab theme={theme} />}
      </div>
      
    </motion.main>
  );
};

// ====================================================================
// TAB 1: User Overview
// ====================================================================
const UserOverviewTab = ({ theme }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await dashboardService.fetchDashboardUser();
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("❌ Failed to fetch dashboard data:", err);
        toast.error(t('dashboard.failedToLoadUserOverview'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingState />;
  if (!stats) return <EmptyState message={t('dashboard.noDataAvailable')} />;

  // Data Processing
  const genderData = [
    { name: t('dashboard.male'), value: parseFloat(stats.genderPercent.male || 0) },
    { name: t('dashboard.female'), value: parseFloat(stats.genderPercent.female || 0) },
    { name: t('dashboard.other'), value: parseFloat(stats.genderPercent.other || 0) },
  ];

  const ageData = Object.entries(stats.agePercent).map(([name, value]) => ({
    name: t(`dashboard.${name}`) || name, // Try to translate key like age16_24
    value: parseFloat(value),
  }));

  const occupationData = stats.occupationPercent.map(o => ({
    name: t(`dashboard.${o.occupation.toLowerCase()}`) || o.occupation,
    value: parseFloat(o.percent),
  }));

  const cityData = stats.cityPercent.map(c => ({
    name: c.address,
    value: parseFloat(c.percent),
  })).slice(0, 5); // Top 5 cities

  const topCategoriesData = stats.topCategories || [];
  const userRequestStats = stats.userRequestStats || {};

  const axisColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  const tooltipCursorColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.totalUsers')} 
          value={stats.totalUsers} 
          subValue={`+${stats.growthRate}% ${t('dashboard.comparedLastMonth')}`}
          icon={Users} 
          color="text-cyan-500 dark:text-cyan-400"
          trend="up"
        />
        <StatCard 
          title={t('dashboard.onlineUsers')} 
          value={stats.onlineUsers} 
          subValue={t('dashboard.activeNow')}
          icon={Activity} 
          color="text-green-500 dark:text-green-400"
        />
        {/* Grouped Request Stats */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-lg flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-600 dark:text-violet-400">
              <MessageSquare size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.requestOverview', 'Request Statistics')}</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('dashboard.totalRequests')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{userRequestStats.totalRequests || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('dashboard.todayRequests')}</p>
              <p className="text-xl font-bold text-yellow-500 dark:text-yellow-400">{userRequestStats.todayRequests || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('dashboard.submitRequests', 'Pending')}</p>
              <p className="text-xl font-bold text-blue-500 dark:text-blue-400">{userRequestStats.submitRequests || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('dashboard.successfulRequests', 'Success')}</p>
              <p className="text-xl font-bold text-green-500 dark:text-green-400">{userRequestStats.successfulRequests || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender Distribution */}
        <ChartCard title={t('dashboard.gender')} className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={genderData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
              >
                {genderData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS.chart[i % COLORS.chart.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Age Distribution */}
        <ChartCard title={t('dashboard.age')} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: tooltipCursorColor }} />
              <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Main Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupation */}
        <ChartCard title={t('dashboard.occupation')} className="lg:col-span-1">
          <div className="space-y-4">
            {occupationData.map((item, index) => (
              <div key={index} className="relative">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Briefcase size={14} className="text-cyan-500" />
                    {item.name}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Top Cities */}
        <ChartCard title={t('dashboard.topCities')} className="lg:col-span-1">
          <div className="space-y-4">
            {cityData.map((item, index) => (
              <div key={index} className="relative">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <MapPin size={14} className="text-pink-500" />
                    {item.name}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Top Categories */}
        <ChartCard title={t('dashboard.topCategories')} className="lg:col-span-1">
          <div className="flex flex-col h-full justify-between">
            <ul className="space-y-3">
              {topCategoriesData.length > 0 ? topCategoriesData.map((cat, idx) => (
                <li key={cat.category_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-200 text-sm">{cat.name}</span>
                  </div>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400 text-sm">{cat.total_sessions}</span>
                </li>
              )) : <li className="text-gray-500 dark:text-gray-400 text-center py-4">{t('dashboard.noCategoryData')}</li>}
            </ul>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};


/* ================= GestureTab ================= */
const GestureTab = ({ theme }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [accuracyOverview, setAccuracyOverview] = useState({ averageAccuracy: 0 });
  const [allocationOverview, setAllocationOverview] = useState({ percentDefault: 0, percentCustom: 0 });
  const [topCustomGestures, setTopCustomGestures] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await dashboardService.fetchDashboardGesture();
        if (res.success) {
          setAccuracyOverview(res.data.accuracyOverview || { averageAccuracy: 0 });
          setAllocationOverview(res.data.allocationOverview || { percentDefault: 0, percentCustom: 0 });
          setTopCustomGestures(res.data.topCustomGestures || []);
        }
      } catch (err) {
        console.error("❌ Failed to fetch gesture overview:", err);
        toast.error(t('dashboard.failedToLoadGestureOverview'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [t]);

  if (loading) return <LoadingState />;

  const allocationData = [
    { name: t('dashboard.defaultGestures'), value: allocationOverview.percentDefault },
    { name: t('dashboard.customUserGestures'), value: allocationOverview.percentCustom },
  ];

  const topGestures = topCustomGestures.map(item => ({
    name: t(`gesture.${item.pose_label}`) || item.pose_label,
    value: item.count
  }));

  const axisColor = theme === 'dark' ? '#fff' : '#374151'; // white vs gray-700
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  const tooltipCursorColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title={t('dashboard.accuracyRate')} 
          value={`${accuracyOverview.averageAccuracy}%`} 
          subValue={t('dashboard.averageDefaultGestureAccuracy')}
          icon={CheckCircle} 
          color="text-green-500 dark:text-green-400"
        />
        <StatCard 
          title={t('dashboard.totalDefault')} 
          value={allocationOverview.defaultCount || 0} 
          subValue={t('dashboard.systemDefined')}
          icon={Layers} 
          color="text-blue-500 dark:text-blue-400"
        />
        <StatCard 
          title={t('dashboard.totalCustom')} 
          value={allocationOverview.customCount || 0} 
          subValue={t('dashboard.userDefined')}
          icon={Zap} 
          color="text-yellow-500 dark:text-yellow-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Chart */}
        <ChartCard title={t('dashboard.allocationUsingGestures')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={100}
                paddingAngle={5}
              >
                {allocationData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={i === 0 ? COLORS.secondary : COLORS.warning} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-white text-2xl font-bold">
                {allocationOverview.percentDefault}%
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 dark:fill-gray-400 text-xs">
                Default
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Gestures Chart */}
        <ChartCard title={t('dashboard.top5GesturesChange')}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={topGestures}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: axisColor, fontSize: 12 }} 
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: tooltipCursorColor }} />
              <Bar dataKey="value" fill={COLORS.info} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

/* ================= VersionTab ================= */
const VersionTab = ({ theme }) => {
  const { t } = useTranslation();
  const [versionData, setVersionData] = useState([]);
  const [recentUpdateData, setRecentUpdateData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await dashboardService.fetchDashboardVersion();
        if (result.success && result.data) {
          setVersionData(result.data.versionAdoption || []); 
          setRecentUpdateData(result.data.recentUpdate || {});
        }
      } catch (err) {
        console.error("Failed to fetch version data:", err);
        toast.error(t('dashboard.failedToLoadVersion'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState />;

  const axisColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  const tooltipCursorColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="flex flex-col gap-6">
      {/* Latest Release Banner */}
      {recentUpdateData && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 p-8">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <GitBranch size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                {t('dashboard.latestRelease')}
              </span>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <Calendar size={14} />
                {new Date(recentUpdateData.release_date).toLocaleDateString("vi-VN")}
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">{recentUpdateData.latest_release}</h2>
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">{t('dashboard.newFeatures')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.isArray(recentUpdateData.new_features) && recentUpdateData.new_features.length > 0 ? (
                  recentUpdateData.new_features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-gray-200 bg-black/20 p-3 rounded-lg border border-white/5">
                      <CheckCircle size={16} className="text-green-400 mt-1 shrink-0" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">{t('dashboard.noNewFeatures')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version Adoption Chart */}
      <ChartCard title={t('dashboard.versionAdoption')}>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={versionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="version_name" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: tooltipCursorColor }} />
              <Bar dataKey="user_count" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={50}>
                {versionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
};

// ====================================================================
// SHARED COMPONENTS
// ====================================================================

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
  <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-lg hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-gray-100 dark:bg-white/5 ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} />
      </div>
    </div>
    {subValue && (
      <p className={`text-xs font-medium flex items-center gap-1 ${trend === 'up' ? 'text-green-500 dark:text-green-400' : 'text-gray-500'}`}>
        {subValue}
      </p>
    )}
  </div>
);

const ChartCard = ({ title, children, className = '' }) => (
  <div className={`p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-lg flex flex-col ${className}`}>
    <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
      <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
      {title}
    </h3>
    <div className="flex-1 min-h-0">
      {children}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-black/90 border border-gray-200 dark:border-white/20 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-gray-600 dark:text-gray-300 text-xs mb-1">{label}</p>
        <p className="text-gray-900 dark:text-white font-bold text-sm">
          {payload[0].value}
          {payload[0].name === 'percent' ? '%' : ''}
        </p>
      </div>
    );
  }
  return null;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-96 gap-4">
    <Loader2 size={48} className="text-cyan-500 animate-spin" />
    <p className="text-gray-400 animate-pulse">Loading dashboard data...</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-500">
    <Layers size={48} className="opacity-20" />
    <p>{message}</p>
  </div>
);

export default Dashboard;
