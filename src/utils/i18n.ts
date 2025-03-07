// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from '../locales/en/translationen.json';
import translationFR from '../locales/en/translationfr.json';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: translationEN,
  },
  fr: {
    translation: translationFR,
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .use(LanguageDetector) // detect user language
  .init({
    resources,
    fallbackLng: 'en', // fallback language if the current language is not available
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;