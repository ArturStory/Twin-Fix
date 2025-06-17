import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

interface TranslatedHeaderProps {
  defaultTitle?: string;
}

const TranslatedHeader: React.FC<TranslatedHeaderProps> = ({ defaultTitle = 'Twin Fix' }) => {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    console.log("TranslatedHeader - updating page titles");
    updatePageTitles();

    const handleLanguageChange = () => {
      console.log("Current language:", i18n.language);
      setCurrentLanguage(i18n.language);
      updatePageTitles();
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, location, currentLanguage]);

  const updatePageTitles = () => {
    // Find all h1 and h2 elements on the page
    const pageTitles = document.querySelectorAll('h1, h2');
    console.log("Found titles:", pageTitles.length);

    pageTitles.forEach(element => {
      const title = element.textContent;
      console.log("Checking title:", title);

      // Handle location page specifically
      if (location === '/location') {
        if (element.textContent === "My Reports" || 
            element.textContent === "Mis Reportes" || 
            element.textContent === "Moje Zgłoszenia" ||
            element.textContent?.includes("okalizacji")) {
          console.log("On location page, updating title:", t('locations.title'));
          element.textContent = t('locations.title');
        } else if (element.textContent === "Twin Fix") {
          console.log("On location page, updating title:", defaultTitle);
          element.textContent = defaultTitle;
        }
      }
    });
  };

  return null; // This is a utility component with no visual output
};

export default TranslatedHeader;