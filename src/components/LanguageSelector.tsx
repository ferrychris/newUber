import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const [showPopup, setShowPopup] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // Check if user has already explicitly selected a language
    const hasSelectedLanguage = localStorage.getItem('i18nextLng');
    // Only show popup if no language has been explicitly selected
    if (!hasSelectedLanguage) {
      setShowPopup(true);
    }
  }, []);

  const handleLanguageSelect = async (language: string) => {
    await i18n.changeLanguage(language);
    setShowPopup(false);
  };

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('selectLanguage')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('continue')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleLanguageSelect('en')}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-300"
              >
                {t('english')}
              </button>
              <button
                onClick={() => handleLanguageSelect('fr')}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-300"
              >
                {t('french')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LanguageSelector; 