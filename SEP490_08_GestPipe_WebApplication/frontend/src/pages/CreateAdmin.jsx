import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Loader2, ChevronDown } from 'lucide-react'; // <-- THÊM ICON
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import adminService from '../services/adminService';
import authService from '../services/authService';
import { useTheme } from '../utils/ThemeContext';
import { motion } from 'framer-motion'; // <-- THÊM

// (Bỏ import Sidebar, Logo, backgroundImage, Sun, Moon, Bell, ChevronDown)

// Hiệu ứng chuyển động
const pageVariants = {
  initial: { opacity: 0, x: "20px" },
  animate: { opacity: 1, x: "0px" },
  exit: { opacity: 0, x: "-20px" },
  transition: { type: 'tween', ease: 'anticipate', duration: 0.3 }
};

const CreateAdmin = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Chỉ cần theme
  const { t } = useTranslation();
  // (Bỏ state admin, showUserDropdown)
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    province: ''
  });
  const [errors, setErrors] = useState({});

  // (Danh sách provinces giữ nguyên)
  const provinces = [
    { key: 'anGiang', value: 'An Giang' },
    { key: 'baRiaVungTau', value: 'Bà Rịa - Vũng Tàu' },
    { key: 'bacLieu', value: 'Bạc Liêu' },
    { key: 'bacKan', value: 'Bắc Kạn' },
    { key: 'bacGiang', value: 'Bắc Giang' },
    { key: 'bacNinh', value: 'Bắc Ninh' },
    { key: 'benTre', value: 'Bến Tre' },
    { key: 'binhDuong', value: 'Bình Dương' },
    { key: 'binhDinh', value: 'Bình Định' },
    { key: 'binhPhuoc', value: 'Bình Phước' },
    { key: 'binhThuan', value: 'Bình Thuận' },
    { key: 'caMau', value: 'Cà Mau' },
    { key: 'caoBang', value: 'Cao Bằng' },
    { key: 'canTho', value: 'Cần Thơ' },
    { key: 'daNang', value: 'Đà Nẵng' },
    { key: 'dakLak', value: 'Đắk Lắk' },
    { key: 'dakNong', value: 'Đắk Nông' },
    { key: 'dienBien', value: 'Điện Biên' },
    { key: 'dongNai', value: 'Đồng Nai' },
    { key: 'dongThap', value: 'Đồng Tháp' },
    { key: 'giaLai', value: 'Gia Lai' },
    { key: 'haGiang', value: 'Hà Giang' },
    { key: 'haNam', value: 'Hà Nam' },
    { key: 'haNoi', value: 'Hà Nội' },
    { key: 'haTinh', value: 'Hà Tĩnh' },
    { key: 'haiDuong', value: 'Hải Dương' },
    { key: 'haiPhong', value: 'Hải Phòng' },
    { key: 'hauGiang', value: 'Hậu Giang' },
    { key: 'hoaBinh', value: 'Hòa Bình' },
    { key: 'hungYen', value: 'Hưng Yên' },
    { key: 'khanhHoa', value: 'Khánh Hòa' },
    { key: 'kienGiang', value: 'Kiên Giang' },
    { key: 'konTum', value: 'Kon Tum' },
    { key: 'laiChau', value: 'Lai Châu' },
    { key: 'lamDong', value: 'Lâm Đồng' },
    { key: 'langSon', value: 'Lạng Sơn' },
    { key: 'laoCai', value: 'Lào Cai' },
    { key: 'longAn', value: 'Long An' },
    { key: 'namDinh', value: 'Nam Định' },
    { key: 'ngheAn', value: 'Nghệ An' },
    { key: 'ninhBinh', value: 'Ninh Bình' },
    { key: 'ninhThuan', value: 'Ninh Thuận' },
    { key: 'phuTho', value: 'Phú Thọ' },
    { key: 'phuYen', value: 'Phú Yên' },
    { key: 'quangBinh', value: 'Quảng Bình' },
    { key: 'quangNam', value: 'Quảng Nam' },
    { key: 'quangNgai', value: 'Quảng Ngãi' },
    { key: 'quangNinh', value: 'Quảng Ninh' },
    { key: 'quangTri', value: 'Quảng Trị' },
    { key: 'socTrang', value: 'Sóc Trăng' },
    { key: 'sonLa', value: 'Sơn La' },
    { key: 'tayNinh', value: 'Tây Ninh' },
    { key: 'thaiBinh', value: 'Thái Bình' },
    { key: 'thaiNguyen', value: 'Thái Nguyên' },
    { key: 'thanhHoa', value: 'Thanh Hóa' },
    { key: 'thuaThienHue', value: 'Thừa Thiên Huế' },
    { key: 'tienGiang', value: 'Tiền Giang' },
    { key: 'hoChiMinh', value: 'TP. Hồ Chí Minh' },
    { key: 'traVinh', value: 'Trà Vinh' },
    { key: 'tuyenQuang', value: 'Tuyên Quang' },
    { key: 'vinhLong', value: 'Vĩnh Long' },
    { key: 'vinhPhuc', value: 'Vĩnh Phúc' },
    { key: 'yenBai', value: 'Yên Bái' }
  ];

  // Check login (vẫn cần để check role)
  useEffect(() => {
    const currentAdmin = authService.getCurrentUser();
    if (!currentAdmin || !['superadmin'].includes(currentAdmin.role)) {
      navigate('/user-list');
    }
  }, [navigate]);

  // (Bỏ handleLogout)

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

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0?)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7}$/;

    // Validate individual fields but don't set individual errors
    let missingFields = [];

    if (!formData.email) {
      missingFields.push(t('createAdmin.email'));
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('notifications.invalidEmailFormat');
    }

    if (!formData.fullName) {
      missingFields.push(t('createAdmin.fullName'));
    }
    
    if (!formData.phoneNumber) {
      missingFields.push(t('createAdmin.phoneNumber'));
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('notifications.invalidPhoneFormat');
    }

    if (!formData.province) {
      missingFields.push(t('createAdmin.province'));
    }

    // Set combined error for missing required fields
    if (missingFields.length > 0) {
      newErrors.combined = t('notifications.fillRequiredFields');
      newErrors.missingFields = missingFields;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Additional validation for phoneNumber
    if (formData.phoneNumber.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    const numberOnlyRegex = /^[0-9]+$/;
    if (!numberOnlyRegex.test(formData.phoneNumber)) {
      toast.error('Phone number can only contain numbers');
      return;
    }

    setLoading(true);

    try {
      const response = await adminService.createAdmin(
        formData.email, 
        formData.fullName,
        formData.phoneNumber,
        formData.province
      );
      setSuccess(response);
      toast.success(t('notifications.adminCreated'));
    } catch (err) {
      const errorMsg = err.response?.data?.message || t('notifications.failedCreateAdmin');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setSuccess(null);
    setFormData({
      email: '',
      fullName: '',
      phoneNumber: '',
      province: ''
    });
  };

  // Input style đồng bộ
  const getInputStyle = (fieldName) => `w-full px-4 py-3 rounded-lg border 
                      ${errors[fieldName] ? 'border-yellow-500' : (theme === 'dark' ? 'border-gray-700' : 'border-gray-300')}
                      ${theme === 'dark' 
                        ? 'bg-gray-900/70 text-white placeholder:text-gray-500' 
                        : 'bg-white text-gray-900 placeholder:text-gray-400'} 
                      focus:outline-none focus:border-cyan-400`;
  
  const labelStyle = `block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <motion.main 
      className="flex-1 overflow-y-auto p-8 font-montserrat flex flex-col items-center justify-center"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageVariants.transition}
    >
      <div className="w-full max-w-3xl mx-auto">
        {!success ? (
          /* Create Form */
          <div className={`backdrop-blur-lg rounded-2xl border shadow-xl p-8 transition-colors duration-300
                          ${theme === 'dark' 
                            ? 'bg-black/50 border-white/20' 
                            : 'bg-white/80 border-gray-200'}`}>
            <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {t('createAdmin.title')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div>
                  <label className={labelStyle}>
                    {t('createAdmin.email')} <span className="text-yellow-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    className={getInputStyle('email')}
                  />
                  {errors.email && <p className="text-yellow-500 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* Full Name */}
                <div>
                  <label className={labelStyle}>
                    {t('createAdmin.fullName')} <span className="text-yellow-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={getInputStyle('fullName')}
                  />
                  {errors.fullName && <p className="text-yellow-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className={labelStyle}>
                    {t('createAdmin.phoneNumber')} <span className="text-yellow-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="0123456789"
                    className={getInputStyle('phoneNumber')}
                  />
                  {errors.phoneNumber && <p className="text-yellow-500 text-sm mt-1">{errors.phoneNumber}</p>}
                </div>

                {/* Combined Error Message - Displayed between Phone Number and Province */}
                {errors.combined && (
                  <div className="md:col-span-2 flex justify-center">
                    <p className="text-yellow-500 text-sm font-medium bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      {errors.combined}
                    </p>
                  </div>
                )}

                {/* Province */}
                <div className="relative">
                  <label className={labelStyle}>
                    {t('createAdmin.province')} <span className="text-yellow-500">*</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setShowProvinceDropdown(!showProvinceDropdown)}
                    className={`${getInputStyle('province')} flex justify-between items-center text-left`}
                  >
                    <span className={formData.province ? (theme === 'dark' ? "text-white" : "text-gray-900") : "text-gray-500"}>
                      {formData.province ? (
                        provinces.find(p => p.value === formData.province) 
                          ? t(`provinces.${provinces.find(p => p.value === formData.province).key}`) 
                          : formData.province
                      ) : t('createAdmin.selectProvince')}
                    </span>
                    <ChevronDown size={18} className="text-gray-400" />
                  </button>
                  {errors.province && <p className="text-yellow-500 text-sm mt-1">{errors.province}</p>}

                  {showProvinceDropdown && (
                    <div className={`absolute z-50 mt-2 w-full rounded-lg shadow-2xl border overflow-hidden
                                    max-h-60 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600
                                    ${theme === 'dark' ? 'bg-[#1a1b26] border-gray-700' : 'bg-white border-gray-200'}`}>
                      {provinces.map((province) => (
                        <button
                          key={province.key}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, province: province.value });
                            if (errors.province) setErrors({ ...errors, province: '' });
                            setShowProvinceDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors border-b last:border-0
                                     ${theme === 'dark' 
                                       ? 'text-gray-300 hover:bg-white/5 hover:text-white border-white/5' 
                                       : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-gray-100'}`}
                        >
                          {t(`provinces.${province.key}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/admin-list')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all 
                             ${theme === 'dark' ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg 
                             hover:from-blue-500 hover:to-cyan-400
                             transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    t('createAdmin.createButton')
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Message */
          <div className={`backdrop-blur-lg rounded-2xl border shadow-xl p-8 transition-colors duration-300
                          ${theme === 'dark' 
                            ? 'bg-black/50 border-white/20' 
                            : 'bg-white/80 border-gray-200'}`}>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={40} className="text-white" />
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {t('createAdmin.successTitle')}
              </h2>
              <p className="text-cyan-400">
                {t('createAdmin.accountCreated')}
              </p>
            </div>

            <div className={`rounded-xl p-6 mb-6 ${theme === 'dark' ? 'bg-gray-900/70' : 'bg-gray-100'}`}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('createAdmin.email')}</p>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{success.admin.email}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('createAdmin.fullName')}</p>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{success.admin.fullName}</p>
                </div>
              </div>
              
              <div className={`rounded-lg p-4 mb-2 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white border border-gray-200'}`}>
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('createAdmin.tempPassword')}</p>
                <code className="block text-lg font-mono font-bold text-cyan-400">
                  {/* Vẫn ẩn password cho an toàn */}
                  {'*'.repeat(success?.temporaryPassword?.length || 10)}
                </code>
              </div>
              <p className="text-xs text-gray-500">
                ⚠️ {t('createAdmin.importantNote')}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin-list')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all 
                           ${theme === 'dark' ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                {t('createAdmin.backToList')}
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg 
                           hover:from-blue-500 hover:to-cyan-400 transition-all"
              >
                {t('createAdmin.createAnother')}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.main>
  );
};

export default CreateAdmin;