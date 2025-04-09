import { useEffect } from 'react';

// Extend Window interface to include Google Translate types
declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: {
      translate: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              autoDisplay: boolean;
              includedLanguages: string;
              layout: any;
            },
            elementId: string
          ): void;
          InlineLayout: {
            SIMPLE: any;
          };
        };
      };
    };
  }
}

const GoogleTranslate = () => {
  useEffect(() => {
    // Add Google Translate script
    const addScript = () => {
      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    };

    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'auto',
          autoDisplay: true,
          includedLanguages: 'en,es,fr,de,it,pt,ru,zh-CN,ja,ko,ar,hi',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        'google_translate_element'
      );
    };

    addScript();

    // Cleanup function
    return () => {
      const script = document.querySelector('script[src*="translate.google.com"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div id="google_translate_element" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2" />
    </div>
  );
};

export default GoogleTranslate; 