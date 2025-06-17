import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Map, Bell, Search, User, Globe, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NavItemProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  center?: boolean;
  notification?: boolean;
}

function NavItem({ href, active, icon, label, center = false, notification = false }: NavItemProps) {
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center px-1.5 py-2 relative",
        active ? "text-primary" : "text-gray-600"
      )}>
        <div className="relative">
          {icon}
          {notification && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
          )}
        </div>
      </div>
    </Link>
  );
}

function BottomNavItem({ href, active, icon, label, notification = false }: NavItemProps) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center px-2">
        <div className={cn(
          "relative flex items-center justify-center w-12 h-12 rounded-full",
          active ? "text-primary" : "text-gray-600"
        )}>
          <div className="relative">
            {icon}
            {notification && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full"></span>
            )}
          </div>
          {active && (
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>
          )}
        </div>
        <span className={cn(
          "text-xs mt-0.5 font-medium",
          active ? "text-primary" : "text-gray-600"
        )}>
          {label}
        </span>
      </div>
    </Link>
  );
}

export default function MobileNav() {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { user, logoutMutation } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setDialogOpen(false);
  };

  // Toggle language handler for mobile view
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'es' : (i18n.language === 'es' ? 'pl' : 'en');
    i18n.changeLanguage(nextLang);
  };

  // Get current language flag
  const getCurrentLanguageFlag = () => {
    switch(i18n.language) {
      case 'en': return '🇬🇧';
      case 'es': return '🇪🇸';
      case 'pl': return '🇵🇱';
      default: return '🇬🇧';
    }
  };

  return (
    <>
      {/* Top Navigation */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-gray-200 z-10 pt-safe">
        <div className="flex items-center justify-between px-3 h-16">
          <div className="flex items-center">
            <div className="relative mr-2.5 flex items-center">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-md blur-sm opacity-30"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-1.5 rounded-md flex items-center justify-center shadow-md">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L19 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L5 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="18" r="3" fill="white"/>
                  <path d="M7 10H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="font-extrabold text-transparent text-base bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                {t('app.name')}
              </div>
              <div className="text-[11px] text-gray-500 -mt-1 leading-none">{t('app.tagline')}</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="px-1.5 py-2 cursor-pointer flex items-center" onClick={toggleLanguage}>
              <span className="text-lg mr-1">{getCurrentLanguageFlag()}</span>
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <div className="ml-1 flex items-center">
                  <Avatar className="h-7 w-7">
                    <AvatarImage 
                      src={user?.photo || "https://randomuser.me/api/portraits/men/1.jpg"} 
                      alt={user?.username || "User"} 
                    />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('user.account') || 'Account'}</DialogTitle>
                  <DialogDescription>
                    {user?.username} ({user?.role})
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <Button asChild variant="outline">
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      {t('nav.profile') || "Profile"}
                    </Link>
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('auth.loggingOut') || "Logging out..."}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('nav.logout') || "Logout"}
                      </span>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10 pb-safe">
        <div className="flex justify-around items-center h-16">
          <BottomNavItem 
            href="/" 
            active={location === "/"} 
            icon={<Home className="h-6 w-6" />} 
            label={t('nav.dashboard').split(' ')[0]}
          />
          <BottomNavItem 
            href="/report" 
            active={location === "/report"} 
            icon={<Search className="h-6 w-6" />} 
            label={t('issues.report')}
          />
          <BottomNavItem 
            href="/locations" 
            active={location === "/locations"} 
            icon={<Map className="h-6 w-6" />} 
            label={t('locations.title')}
          />
          <BottomNavItem 
            href="/my-reports" 
            active={location === "/my-reports"} 
            icon={<Bell className="h-6 w-6" />} 
            label={t('issues.issues')}
          />
        </div>
      </div>
    </>
  );
}
