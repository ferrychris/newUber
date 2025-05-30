import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

// For debugging
console.log('Loading translations:', { en: enTranslation, fr: frTranslation });

// Initialize i18next
const resources = {
  en: {
    translation: enTranslation
  },
  fr: {
    translation: frTranslation
  }
};

// Try to get stored language or default to browser language
const storedLanguage = localStorage.getItem('i18nextLng');
const browserLanguage = navigator.language.split('-')[0];
const defaultLanguage = storedLanguage || (browserLanguage === 'fr' ? 'fr' : 'en');

console.log('Language detection:', { storedLanguage, browserLanguage, defaultLanguage });

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: defaultLanguage,
    debug: true, // Enable debug mode
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Add language change event listener for debugging
i18n.on('languageChanged', (lng) => {
  console.log(`Language changed to: ${lng}`);
});

// Helper functions for language management
export const changeLanguage = (language: string) => {
  return i18n.changeLanguage(language);
};

export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

export default i18n;
