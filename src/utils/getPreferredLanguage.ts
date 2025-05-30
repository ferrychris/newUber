export const getPreferredLanguage = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const lang = navigator.language || (navigator as any).userLanguage;
    if (lang.startsWith('fr')) return 'fr';
    return 'en';
  }
  return 'en'; // Default to English for SSR
};
