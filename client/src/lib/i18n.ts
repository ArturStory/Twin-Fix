import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language resources
import translationEN from '../locales/en/translation.json';
import translationES from '../locales/es/translation.json';
import translationPL from '../locales/pl/translation.json';

// Get language preference from localStorage or default to 'en'
const savedLng = localStorage.getItem('i18nextLng');
const userLanguage = savedLng ? savedLng : 'en';

// Configure i18n resources
const resources = {
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  },
  pl: {
    translation: translationPL
  }
};

// Initialize i18next - simple configuration
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: userLanguage,
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    react: {
      useSuspense: false,
    }
  });

export default i18n;