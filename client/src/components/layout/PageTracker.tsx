import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

// Import for translations
import i18next from 'i18next';

// Function to get translated page names based on current language
const getTranslatedPageNames = (language: string): Record<string, string> => {
  if (language === 'pl') {
    return {
      '/': 'Pulpit',
      '/issues': 'Lista Problemów',
      '/issues/history': 'Historia Problemów',
      '/issue': 'Szczegóły Problemu',
      '/report': 'Zgłoś Problem',
      '/location': 'Lokalizacja',
      '/my-reports': 'Moje Zgłoszenia',
      '/stats': 'Statystyki',
      '/machines': 'Inwentarz',
      '/users': 'Zarządzanie Użytkownikami',
      '/profile': 'Profil',
      '/locations': 'Zarządzanie Lokalizacjami',
    };
  } else if (language === 'es') {
    return {
      '/': 'Panel',
      '/issues': 'Lista de Problemas',
      '/issues/history': 'Historial de Problemas',
      '/issue': 'Detalles del Problema',
      '/report': 'Reportar Problema',
      '/location': 'Ubicación',
      '/my-reports': 'Mis Reportes',
      '/stats': 'Estadísticas',
      '/machines': 'Inventario',
      '/users': 'Gestión de Usuarios',
      '/profile': 'Perfil',
      '/locations': 'Gestión de Ubicaciones',
    };
  } else {
    // Default English
    return {
      '/': 'Dashboard',
      '/issues': 'Issues List',
      '/issues/history': 'Issues History',
      '/issue': 'Issue Details',
      '/report': 'Report Issue',
      '/location': 'Location',
      '/my-reports': 'My Reports',
      '/stats': 'Statistics',
      '/machines': 'Inventory',
      '/users': 'User Management',
      '/profile': 'Profile',
      '/locations': 'Location Management',
    };
  }
};

/**
 * This component tracks page navigation locally
 * Also updates page titles based on the current language
 */
export function PageTracker() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18next.language);
  const [pageNames, setPageNames] = useState(getTranslatedPageNames(i18next.language));

  // Handle language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      const newLang = i18next.language;
      console.log("Language changed to:", newLang);
      setCurrentLanguage(newLang);
      setPageNames(getTranslatedPageNames(newLang));
      
      // After language change, update the page title in the DOM
      updatePageTitleInDOM(location, newLang);
    };
    
    i18next.on('languageChanged', handleLanguageChange);
    
    // Initial page title update
    updatePageTitleInDOM(location, currentLanguage);
    
    return () => {
      i18next.off('languageChanged', handleLanguageChange);
    };
  }, [location]);

  // Log navigation events locally
  useEffect(() => {
    if (!user) {
      return;
    }

    // Find the friendly page name, or use a default
    const pageName = getPageName(location, pageNames);

    // Log the navigation to console
    console.log(`User navigation: ${user.username} navigated to ${pageName} (${location})`);
    
    // Update the page title when navigation changes
    updatePageTitleInDOM(location, currentLanguage);
  }, [location, user, pageNames, currentLanguage]);
  
  // Helper function to get the page name
  const getPageName = (path: string, names: Record<string, string>): string => {
    // Try to match by exact path first
    if (names[path]) {
      return names[path];
    } 
    
    // Then try to match by prefix
    for (const [routePath, name] of Object.entries(names)) {
      if (path.startsWith(routePath) && routePath !== '/') {
        return name;
      }
    }
    
    return 'Unknown Page';
  };
  
  // Helper function to update the page title in the DOM
  const updatePageTitleInDOM = (path: string, language: string) => {
    const titleMap = getTranslatedPageNames(language);
    const newTitle = getPageName(path, titleMap);
    
    console.log(`Updating page title for path: ${path} to "${newTitle}" (${language})`);
    
    // Find the h1 element that contains the page title
    setTimeout(() => {
      // Get the page's h1 element (assuming there's only one main h1 for the page title)
      const h1Elements = document.querySelectorAll('h1');
      if (h1Elements.length > 0) {
        // For location page specifically, find the one that is NOT Twin Fix
        if (path === '/location' || path.startsWith('/location')) {
          for (const h1 of h1Elements) {
            if (h1.textContent !== 'Twin Fix') {
              console.log(`Found location page title, updating from "${h1.textContent}" to "${newTitle}"`);
              h1.textContent = newTitle;
              break;
            }
          }
        }
      }
    }, 150); // Small delay to ensure DOM is ready
  };

  // This component doesn't render anything visible
  return null;
}