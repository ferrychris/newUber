import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    // Resources
    resources: {
      en: {
        translation: enTranslation
      },
      fr: {
        translation: frTranslation
      }
    },
    fallbackLng: 'en',
    lng: 'en', // Default language
    debug: true, // Enable debug mode to see what's happening
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Log the initialized i18n instance for debugging
console.log('i18n initialized:', i18n);

// Helper function to change language
export const changeLanguage = (lng: string) => {
  console.log(`Changing language to: ${lng}`);
  return i18n.changeLanguage(lng);
};

// Helper function to get current language
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

export default i18n;
