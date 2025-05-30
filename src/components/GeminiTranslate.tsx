import React, { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { FaGlobe } from 'react-icons/fa';

// Define the available languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' }
];

// Define the translation context
interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translate: (text: string) => Promise<string>;
  translateImmediate: (text: string) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation cache to avoid repeated API calls
const translationCache: Record<string, Record<string, string>> = {};

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    // Try to get from localStorage first
    const savedLang = localStorage.getItem('gemini-language');
    if (savedLang) return savedLang;
    
    // Then try browser language
    const browserLang = navigator.language.split('-')[0];
    if (LANGUAGES.some(lang => lang.code === browserLang)) return browserLang;
    
    // Default to English
    return 'en';
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('gemini-language', currentLanguage);
  }, [currentLanguage]);
  
  // Function to set language
  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
  };
  
  // Function to translate text using Gemini AI
  const translate = async (text: string): Promise<string> => {
    // If text is empty or language is English, return as is
    if (!text || currentLanguage === 'en') return text;
    
    // Check cache first
    if (translationCache[currentLanguage]?.[text]) {
      return translationCache[currentLanguage][text];
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, you would call the Gemini API here
      // For now, we'll simulate the API call with a timeout
      const targetLanguage = LANGUAGES.find(lang => lang.code === currentLanguage)?.name || 'English';
      
      // Simulated API call
      const response = await new Promise<string>(resolve => {
        setTimeout(() => {
          // This is where you would integrate with the Gemini API
          // For now, we'll just append the language code to simulate translation
          const translated = `${text} (${targetLanguage})`;
          resolve(translated);
        }, 300);
      });
      
      // Cache the result
      if (!translationCache[currentLanguage]) {
        translationCache[currentLanguage] = {};
      }
      translationCache[currentLanguage][text] = response;
      
      return response;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function for immediate translation (from cache only)
  const translateImmediate = (text: string): string => {
    if (!text || currentLanguage === 'en') return text;
    return translationCache[currentLanguage]?.[text] || text;
  };
  
  return (
    <TranslationContext.Provider value={{ 
      currentLanguage, 
      setLanguage, 
      translate, 
      translateImmediate,
      isLoading 
    }}>
      {children}
    </TranslationContext.Provider>
  );
};

// Hook to use translations
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Translatable text component
export const T: React.FC<{ text: string }> = ({ text }) => {
  const { translate, translateImmediate, isLoading, currentLanguage } = useTranslation();
  const [translated, setTranslated] = useState<string>(translateImmediate(text));
  
  useEffect(() => {
    if (currentLanguage !== 'en') {
      translate(text).then(setTranslated);
    } else {
      setTranslated(text);
    }
  }, [text, currentLanguage, translate]);
  
  return <>{isLoading ? '...' : translated}</>;
};

// Language selector component
export const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-2 rounded-md hover:bg-gray-50 text-gray-700"
        aria-label="Change language"
      >
        <FaGlobe className="text-gray-600" />
        <span className="text-sm font-medium">{currentLanguage.toUpperCase()}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                currentLanguage === lang.code 
                  ? 'bg-gray-50 text-[#D95F3B] font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default { TranslationProvider, useTranslation, T, LanguageSelector };
