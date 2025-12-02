import React, { createContext, useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(() => {
    // Get language from admin data in localStorage
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      const admin = JSON.parse(adminData);
      return admin.uiLanguage || 'en';
    }
    return 'en'; // Default to English before login
  });

  useEffect(() => {
    // Change i18n language when language state changes
    i18n.changeLanguage(language);
    
    // Save to localStorage
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      const admin = JSON.parse(adminData);
      admin.uiLanguage = language;
      localStorage.setItem('admin', JSON.stringify(admin));
    }
  }, [language, i18n]);

  const changeLanguage = async (newLanguage) => {
    try {
      // Update state (will trigger useEffect)
      setLanguage(newLanguage);

      // Update admin uiLanguage in database
      const adminData = localStorage.getItem('admin');
      if (adminData) {
        const admin = JSON.parse(adminData);
        const token = localStorage.getItem('token');
        
        // Use either _id or id (backend returns 'id', but some places use '_id')
        const adminId = admin._id || admin.id;
        
        if (!adminId) {
          console.error('Admin ID not found in localStorage');
          return;
        }
        
        // Call API to update admin language
        const response = await fetch(`http://localhost:5000/api/admin/update-profile/${adminId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ uiLanguage: newLanguage })
        });

        if (!response.ok) {
          console.error('Failed to update language in database');
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
