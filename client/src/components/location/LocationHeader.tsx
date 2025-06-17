import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

/**
 * A component that ensures proper translation for the location header
 * This fixes the issue where Polish text was showing in English interface
 */
export default function LocationHeader() {
  const { t } = useTranslation();
  
  // Get location header texts based on current language with proper fallbacks
  const getViewLocationText = () => {
    if (i18n.language === 'en') return 'View Location';
    if (i18n.language === 'pl') return 'Zobacz Lokalizację';
    if (i18n.language === 'es') return 'Ver Ubicación';
    return 'View Location';
  };

  const getIssueLocationsText = () => {
    if (i18n.language === 'en') return 'Issue Locations';
    if (i18n.language === 'pl') return 'Lokalizacje Problemów';
    if (i18n.language === 'es') return 'Ubicaciones de Problemas';
    return 'Issue Locations';
  };

  const getOutdoorMapText = () => {
    if (i18n.language === 'en') return 'Outdoor Map';
    if (i18n.language === 'pl') return 'Mapa Zewnętrzna';
    if (i18n.language === 'es') return 'Mapa Exterior';
    return 'Outdoor Map';
  };
  
  return (
    <div className="flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white drop-shadow-sm">
        {getViewLocationText()}
      </h2>
      <div className="mt-1">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-100 flex items-center drop-shadow-sm">
          {getIssueLocationsText()}
          <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-200 drop-shadow-sm">
            {getOutdoorMapText()}
          </span>
        </h3>
      </div>
    </div>
  );
}