import React from 'react';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import vnFlag from '../assets/flags/vn.svg';
import gbFlag from '../assets/flags/gb.svg';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();
  const { theme } = useTheme();
  const { t } = useTranslation();


  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('vi')}
        className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all duration-200 ease-in-out ${ // 👈 THÊM VÀO ĐÂY
          language === 'vi' 
            ? 'border-cyan-400 scale-110' 
            : 'border-transparent opacity-60 hover:opacity-100'
        }`}
        title={t('language.vietnamese', { defaultValue: 'Vietnamese' })}
      >
        <img src={vnFlag} alt="VN" className="w-full h-full object-cover" />
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all duration-200 ease-in-out ${ // 👈 THÊM VÀO ĐÂY
          language === 'en' 
            ? 'border-cyan-400 scale-110' 
            : 'border-transparent opacity-60 hover:opacity-100'
        }`}
        title={t('language.english', { defaultValue: 'English' })}
      >
        <img src={gbFlag} alt="EN" className="w-full h-full object-cover" />
      </button>
    </div>
  );
};

export default LanguageSwitcher;