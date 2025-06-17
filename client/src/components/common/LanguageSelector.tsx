import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Language selector that displays only the current language flag
 * and allows switching languages via dropdown
 */
export default function LanguageSelector() {
  const { i18n } = useTranslation();
  
  // Simplified language switching with complete page reload to prevent mixed languages
  const switchLanguage = (lang: string) => {
    // Set the language in localStorage
    localStorage.setItem('i18nextLng', lang);
    
    // Force a complete page reload to ensure clean language state
    window.location.reload();
  };

  // Get current language directly from i18n instance
  const currentLang = i18n.language?.split('-')[0] || 'en';

  // Flag emoji and language name mappings
  const languages = {
    en: { flag: '🇬🇧', name: 'English' },
    es: { flag: '🇪🇸', name: 'Español' },
    pl: { flag: '🇵🇱', name: 'Polski' }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="p-0 w-8 h-8 flex items-center justify-center"
        >
          <span className="text-lg">{languages[currentLang as keyof typeof languages]?.flag || '🇬🇧'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLanguage('en')} className={currentLang === 'en' ? 'bg-blue-50 dark:bg-blue-900/30' : ''}>
          <span className="text-lg mr-2">🇬🇧</span>
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('es')} className={currentLang === 'es' ? 'bg-blue-50 dark:bg-blue-900/30' : ''}>
          <span className="text-lg mr-2">🇪🇸</span>
          <span>Español</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('pl')} className={currentLang === 'pl' ? 'bg-blue-50 dark:bg-blue-900/30' : ''}>
          <span className="text-lg mr-2">🇵🇱</span>
          <span>Polski</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}