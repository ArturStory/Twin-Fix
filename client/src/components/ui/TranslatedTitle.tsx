import { useEffect, useState } from 'react';
import i18next from 'i18next';

interface TranslatedTitleProps {
  en: string;
  pl: string;
  es: string;
  className?: string;
}

/**
 * A component that directly renders text based on the current language
 * Used for critical UI elements where normal translation mechanisms may fail
 */
export default function TranslatedTitle({ en, pl, es, className = "" }: TranslatedTitleProps) {
  const [currentText, setCurrentText] = useState(en);
  
  // Update text whenever language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      const lang = i18next.language;
      if (lang === 'pl') setCurrentText(pl);
      else if (lang === 'es') setCurrentText(es);
      else setCurrentText(en);
    };
    
    // Set initial text
    handleLanguageChange();
    
    // Listen for language changes
    i18next.on('languageChanged', handleLanguageChange);
    
    // Cleanup
    return () => {
      i18next.off('languageChanged', handleLanguageChange);
    };
  }, [en, pl, es]);
  
  return <span className={className}>{currentText}</span>;
}