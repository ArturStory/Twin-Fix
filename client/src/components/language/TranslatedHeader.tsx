import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import i18next from 'i18next';

/**
 * A component that translates page headers based on the current route and language
 * This directly injects translated titles into the DOM to bypass any translation system issues
 */
export default function TranslatedHeader() {
  const [location] = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState(i18next.language);
  
  // Update whenever language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18next.language);
    };
    
    // Set initial value
    handleLanguageChange();
    
    // Listen for language changes
    i18next.on('languageChanged', handleLanguageChange);
    
    // Find and replace page titles directly in the DOM
    fixPageTitles();
    
    return () => {
      i18next.off('languageChanged', handleLanguageChange);
    };
  }, [currentLanguage, location]);
  
  // Function to correct all problematic title elements in the DOM
  const fixPageTitles = () => {
    // Fix all title issues with this comprehensive approach
    setTimeout(() => {
      console.log("Applying comprehensive title fixes for route:", location);
      
      // First, find any problematic title with "My Reports" + text issues
      const allPageHeaders = document.querySelectorAll('h1, h2, h3');
      
      // Fix broken titles that contain multiple text fragments
      allPageHeaders.forEach(header => {
        const headerText = header.textContent || '';
        
        // Check for problematic mixed text like "My Reports okalizacji"
        if (headerText.includes('My Reports') || 
            headerText.includes('Moje Zgłoszenia') || 
            headerText.includes('Mis Reportes')) {
          
          // Apply correct title based on the current page
          if (location === '/statistics' || location.includes('/statistics')) {
            applyStatisticsTitle(header);
          } else if (location === '/location' || location.includes('/location')) {
            applyLocationTitle(header);
          }
        }
        
        // Direct page identification by route, regardless of current content
        if (location === '/statistics' || location.includes('/statistics')) {
          applyStatisticsTitle(header);
        } else if (location === '/location' || location.includes('/location')) {
          applyLocationTitle(header);
        }
      });
      
      // Also fix subheaders and card titles on statistics page
      if (location === '/statistics' || location.includes('/statistics')) {
        // Fix secondary card titles
        const cardTitles = document.querySelectorAll('.card-title, [class*="CardTitle"]');
        cardTitles.forEach(title => {
          const titleText = title.textContent || '';
          
          if (titleText === 'legend.title' || titleText.includes('Legend')) {
            if (currentLanguage === 'pl') title.textContent = 'Legenda Statusów';
            else if (currentLanguage === 'es') title.textContent = 'Leyenda de Estados';
            else title.textContent = 'Status Legend';
          }
          
          if (titleText === 'statistics.issuesByStatus' || titleText.includes('Issues By Status')) {
            if (currentLanguage === 'pl') title.textContent = 'Zgłoszenia według statusu';
            else if (currentLanguage === 'es') title.textContent = 'Problemas por estado';
            else title.textContent = 'Issues By Status';
          }
          
          if (titleText === 'statistics.issuesTrend' || titleText.includes('Issues Trend')) {
            if (currentLanguage === 'pl') title.textContent = 'Trendy zgłoszeń';
            else if (currentLanguage === 'es') title.textContent = 'Tendencia de problemas';
            else title.textContent = 'Issues Trend';
          }
        });
        
        // Fix tab labels and buttons
        const tabLabels = document.querySelectorAll('.tab, button, [role="tab"]');
        tabLabels.forEach(label => {
          const labelText = label.textContent || '';
          
          if (labelText === 'statistics.overview' || labelText.includes('Overview')) {
            if (currentLanguage === 'pl') label.textContent = 'Przegląd';
            else if (currentLanguage === 'es') label.textContent = 'Resumen';
            else label.textContent = 'Overview';
          }
        });
      }
    }, 300);
  };
  
  // Helper functions to apply specific page titles
  const applyLocationTitle = (element: HTMLElement) => {
    if (currentLanguage === 'pl') {
      element.textContent = 'Lokalizacja';
    } else if (currentLanguage === 'es') {
      element.textContent = 'Ubicación';
    } else {
      element.textContent = 'Location';
    }
    
    // Mark as fixed to avoid further changes
    element.dataset.translationFixed = 'true';
  };
  
  const applyStatisticsTitle = (element: HTMLElement) => {
    if (currentLanguage === 'pl') {
      element.textContent = 'Statystyki Lokalizacji';
    } else if (currentLanguage === 'es') {
      element.textContent = 'Estadísticas de Ubicación';
    } else {
      element.textContent = 'Location Statistics';
    }
    
    // Mark as fixed to avoid further changes
    element.dataset.translationFixed = 'true';
  };
  
  // Component doesn't render anything visible - it works behind the scenes
  return null;
}