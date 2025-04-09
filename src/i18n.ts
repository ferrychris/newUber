import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
const enTranslations = {
  welcome: 'Welcome to DavidUber',
  selectLanguage: 'Select Your Language',
  continue: 'Please choose your preferred language to continue',
  english: 'English',
  french: 'French',
  // Add more translations as needed
};

// French translations
const frTranslations = {
  welcome: 'Bienvenue sur DavidUber',
  selectLanguage: 'Choisissez votre langue',
  continue: 'Veuillez choisir votre langue préférée pour continuer',
  english: 'Anglais',
  french: 'Français',
  // Add more translations as needed
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    supportedLngs: ['en', 'fr'],
    fallbackLng: 'en',
    detection: {
      order: ['cookie', 'localStorage', 'navigator'],
      caches: ['cookie'],
      cookieOptions: {
        path: '/',
        maxAge: 365 * 24 * 60 * 60, // 1 year
      },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n; 