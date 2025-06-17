import { useTranslation } from 'react-i18next';
import React from 'react';

// This component translates standard location names like "Ground Floor", "Kitchen", etc.
// It leaves custom names unchanged
export const TranslateLocationName: React.FC<{ name: string }> = ({ name }) => {
  const { i18n } = useTranslation();
  
  // Handle case where the name already contains 'locations.' (raw translation key)
  if (name.startsWith('locations.')) {
    // Extract the key and return appropriate translation
    const key = name.replace('locations.', '');
    return <>{getTranslationForKey(key, i18n.language)}</>;
  }
  
  // Map of standard English names to their translations
  const standardNames: Record<string, { en: string; es: string; pl: string }> = {
    // Floors
    'Ground Floor': { en: 'Ground Floor', es: 'Planta Baja', pl: 'Parter' },
    'First Floor': { en: 'First Floor', es: 'Primer Piso', pl: 'Pierwsze Piętro' },
    'Main Floor': { en: 'Main Floor', es: 'Piso Principal', pl: 'Główne Piętro' },
    
    // Rooms
    'Kitchen': { en: 'Kitchen', es: 'Cocina', pl: 'Kuchnia' },
    'Dining Area': { en: 'Dining Area', es: 'Área de Comedor', pl: 'Sala Jadalnia' },
    'Counter Area': { en: 'Counter Area', es: 'Área del Mostrador', pl: 'Obszar Kasy' },
    'Drive Thru': { en: 'Drive Thru', es: 'Autoservicio', pl: 'Drive Thru' },
    'Office': { en: 'Office', es: 'Oficina', pl: 'Biuro' }, 
    'Storage': { en: 'Storage', es: 'Almacén', pl: 'Magazyn' },
    'Restrooms': { en: 'Restrooms', es: 'Baños', pl: 'Toalety' },
  };
  
  // Check if this is a standard name we should translate
  if (name in standardNames) {
    const currentLang = i18n.language as 'en' | 'es' | 'pl';
    return <>{standardNames[name][currentLang] || standardNames[name].en}</>;
  }
  
  // If not a standard name, return as is
  return <>{name}</>;
};

function getTranslationForKey(key: string, language: string): string {
  const translations: Record<string, { en: string; es: string; pl: string }> = {
    'groundFloor': { en: 'Ground Floor', es: 'Planta Baja', pl: 'Parter' },
    'firstFloor': { en: 'First Floor', es: 'Primer Piso', pl: 'Pierwsze Piętro' },
    'mainFloor': { en: 'Main Floor', es: 'Piso Principal', pl: 'Główne Piętro' },
  };
  
  const translation = translations[key];
  if (translation) {
    const lang = language as 'en' | 'es' | 'pl';
    return translation[lang] || translation.en;
  }
  
  return key;
}

export default TranslateLocationName;