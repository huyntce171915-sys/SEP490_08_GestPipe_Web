import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Custom backend to fetch translations from MongoDB via API
const backendPlugin = {
  type: 'backend',
  init: () => {},
  read: async (language, namespace, callback) => {
    try {
      const response = await fetch(`http://localhost:5000/api/translations/${language}`);
      const data = await response.json();
      callback(null, data);
    } catch (error) {
      console.error('Error loading translations:', error);
      callback(error, null);
    }
  }
};

i18n
  .use(backendPlugin)
  .use(initReactI18next)
  .init({
    lng: 'en', // Default language (before login)
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
