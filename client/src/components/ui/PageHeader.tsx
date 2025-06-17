import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';
import i18n from 'i18next';

interface PageHeaderProps {
  titleKey: string;
  defaultTitle: string;
  titlePL?: string;
  titleES?: string;
  subtitleKey?: string;
  defaultSubtitle?: string;
  subtitlePL?: string;
  subtitleES?: string;
  actions?: ReactNode;
}

/**
 * A consistent page header component with proper translation support
 */
export default function PageHeader({ 
  titleKey, 
  defaultTitle,
  titlePL,
  titleES,
  subtitleKey, 
  defaultSubtitle,
  subtitlePL,
  subtitleES,
  actions 
}: PageHeaderProps) {
  const { t } = useTranslation();
  
  // Direct language-specific texts for guaranteed translations
  const getLocalizedTitle = () => {
    const lang = i18n.language;
    if (lang === 'pl' && titlePL) return titlePL;
    if (lang === 'es' && titleES) return titleES;
    if (lang === 'en') return defaultTitle;
    return t(titleKey, defaultTitle); // Fallback to i18next
  };
  
  const getLocalizedSubtitle = () => {
    const lang = i18n.language;
    if (lang === 'pl' && subtitlePL) return subtitlePL;
    if (lang === 'es' && subtitleES) return subtitleES;
    if (lang === 'en') return defaultSubtitle;
    return subtitleKey ? t(subtitleKey, defaultSubtitle || '') : '';
  };
  
  return (
    <div className="flex flex-col mb-6">
      <div className="w-full">
        <h1 className="text-3xl font-bold text-white block truncate">
          {getLocalizedTitle()}
        </h1>
      </div>
      {(subtitleKey || subtitlePL || subtitleES) && (
        <div className="w-full mt-1">
          <p className="text-gray-300 block truncate">
            {getLocalizedSubtitle()}
          </p>
        </div>
      )}
      {actions && (
        <div className="col-span-1 mt-4">
          {actions}
        </div>
      )}
    </div>
  );
}