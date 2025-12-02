import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// (Bỏ import Sun, Moon, Bell, ChevronDown)
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authService from '../services/authService';
import adminService from '../services/adminService';
import { useTheme } from '../utils/ThemeContext';
// (Bỏ import Sidebar, AdminSidebar, Logo, backgroundImage)
import { Loader2 } from 'lucide-react'; // Thêm Loader
import { motion } from 'framer-motion'; // Thêm motion

// Hiệu ứng
const pageVariants = {
  initial: { opacity: 0, x: "20px" },
  animate: { opacity: 1, x: "0px" },
  exit: { opacity: 0, x: "-20px" },
  transition: { type: 'tween', ease: 'anticipate', duration: 0.3 }
};

const EditProfile = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Bỏ toggleTheme
  const { t } = useTranslation();
  
  // (Bỏ state showUserDropdown)
  const [admin, setAdmin] = useState(null); // Vẫn cần admin để lấy _id
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    email: '',
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

  // Check login và pre-fill form
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

    const parsedAdmin = adminData; // authService đã parse
    setAdmin(parsedAdmin);
    
    setFormData({
      fullName: parsedAdmin.fullName || '',
      birthday: parsedAdmin.birthday ? parsedAdmin.birthday.split('T')[0] : '',
      email: parsedAdmin.email || '',
      phoneNumber: parsedAdmin.phoneNumber || '',
      province: parsedAdmin.province || ''
    });
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
    const phoneRegex = /^(0?)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7}$/;

    if (!formData.fullName.trim()) {
      newErrors.fullName = t('notifications.nameRequired');
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('notifications.phoneRequired');
    } else if (!phoneRegex.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = t('notifications.invalidPhoneFormat');
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
      const adminId = admin._id || admin.id;
      
      const response = await adminService.updateProfile(adminId, {
        fullName: formData.fullName,
        birthday: formData.birthday,
        phoneNumber: formData.phoneNumber,
        province: formData.province
      });

      // Update localStorage
      const updatedAdmin = {
        ...admin,
        fullName: formData.fullName,
        birthday: formData.birthday,
        phoneNumber: formData.phoneNumber,
        province: formData.province
      };
      localStorage.setItem('admin', JSON.stringify(updatedAdmin));
      setAdmin(updatedAdmin);

      toast.success(t('notifications.profileUpdated'));
      
      setTimeout(() => {
        navigate('/profile'); // Quay về trang profile
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || t('notifications.failedUpdateProfile');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Style input đồng bộ
  const getInputStyle = (fieldName) => `flex-1 px-4 py-2 rounded-lg border 
                      ${errors[fieldName] ? 'border-yellow-500' : (theme === 'dark' ? 'border-gray-700' : 'border-gray-300')}
                      ${theme === 'dark' 
                        ? 'bg-gray-900/70 text-white placeholder:text-gray-500' 
                        : 'bg-white text-gray-900 placeholder:text-gray-400'} 
                      focus:outline-none focus:border-cyan-400 transition-colors duration-300`;
  const labelStyle = `w-48 font-semibold text-base ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`;

  // (Bỏ Loading screen cũ)
  if (!admin) {
    return (
      <main className="flex-1 overflow-hidden p-8 font-montserrat flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-cyan-500 animate-spin" />
      </main>
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
        {/* Edit Profile Form (Style "kính mờ") */}
        <div className={`backdrop-blur-lg rounded-2xl border shadow-xl p-8 sm:p-10 transition-colors duration-300
                        ${theme === 'dark' 
                          ? 'bg-black/50 border-white/20' 
                          : 'bg-white/80 border-gray-200'}`}>
          <h2 className={`text-3xl font-bold text-center mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {t('editProfile.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center">
                <label className={labelStyle}>
                  {t('editProfile.name')}
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={getInputStyle('fullName')}
                  placeholder="Enter your name"
                />
              </div>
              {errors.fullName && (
                <p className="text-yellow-500 text-sm ml-48 mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Date of Birthday */}
            <div className="flex items-center">
              <label className={labelStyle}>
                {t('editProfile.birthday')}
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className={`${getInputStyle('birthday')} date-input-blue-icon`}
              />
            </div>

            {/* Gmail (disabled) */}
            <div className="flex items-center">
              <label className={labelStyle}>
                {t('editProfile.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className={`${getInputStyle('email')} cursor-not-allowed opacity-70 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center">
                <label className={labelStyle}>
                  {t('editProfile.phone')}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={getInputStyle('phoneNumber')}
                  placeholder="Enter your phone number"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-yellow-500 text-sm ml-48 mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Address (Province Dropdown) */}
            <div className="flex items-center">
              <label className={labelStyle}>
                {t('editProfile.province')}
              </label>
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                className={`${getInputStyle('province')} appearance-none`}
              >
                <option value="">{t('createAdmin.selectProvince')}</option>
                {provinces.map((province) => (
                  <option key={province.key} value={province.value}>
                    {t(`provinces.${province.key}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className={`px-8 py-3 rounded-lg font-medium transition-all
                           ${theme === 'dark' ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-lg font-medium transition-all
                           bg-gradient-to-r from-blue-600 to-cyan-500 text-white
                           hover:from-blue-500 hover:to-cyan-400
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={20} className="mx-auto animate-spin" />
                ) : (
                  t('editProfile.save')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.main>
    // (Bỏ div layout)
  );
};

export default EditProfile;