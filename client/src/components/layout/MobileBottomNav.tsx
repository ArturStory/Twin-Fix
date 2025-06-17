import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Home, PlusCircle, MapPin, Bell, MessageSquare, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Direct translation mapping to ensure consistent display
  const getNavLabel = (key: string) => {
    // Direct language-based translations to bypass caching issues
    if (i18n.language === 'pl') {
      const polishLabels: Record<string, string> = {
        'home': 'Główna',
        'report': 'Zgłoś', 
        'locations': 'Zarządzaj Lokalizacjami',
        'notifications': 'Powiadomienia'
      };
      return polishLabels[key];
    } else if (i18n.language === 'es') {
      const spanishLabels: Record<string, string> = {
        'home': 'Inicio',
        'report': 'Reportar',
        'locations': 'Gestionar Ubicaciones', 
        'notifications': 'Notificaciones'
      };
      return spanishLabels[key];
    } else {
      // English fallback
      const englishLabels: Record<string, string> = {
        'home': 'Home',
        'report': 'Report',
        'locations': 'Manage Locations',
        'notifications': 'Notifications'
      };
      return englishLabels[key];
    }
  };

  const navItems = [
    {
      href: "/",
      label: getNavLabel('home'),
      icon: <Home className="h-5 w-5" />,
      active: location === "/"
    },
    {
      href: "/report",
      label: getNavLabel('report'),
      icon: <PlusCircle className="h-5 w-5" />,
      active: location === "/report"
    },
    {
      href: "/shared-locations",
      label: getNavLabel('locations'),
      icon: <MapPin className="h-5 w-5" />,
      active: location === "/shared-locations"
    },
    {
      href: "/problems",
      label: getNavLabel('notifications'),
      icon: <Bell className="h-5 w-5" />,
      active: location === "/problems" || location === "/notifications"
    },
  ];

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-between">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center py-2 flex-1"
          >
            <div 
              className={cn(
                "flex flex-col items-center justify-center",
                item.active 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                item.active ? "text-primary" : "text-muted-foreground",
                "drop-shadow-sm"
              )}>
                {item.icon}
              </div>
            </div>
          </Link>
        ))}
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center py-2 flex-1"
        >
          <div className="text-muted-foreground hover:text-primary transition-colors">
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}