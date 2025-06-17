import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Bell, PlusCircle, User, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import LanguageSelector from "@/components/common/LanguageSelector";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SmartNotificationBell from "@/components/notifications/SmartNotificationBell";

import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavProps {
  onMenuButtonClick?: () => void;
  menuIconHidden?: boolean;
  hideNotificationBell?: boolean;
  mobileOnly?: boolean;
}

export default function TopNav({ onMenuButtonClick, menuIconHidden = false, hideNotificationBell = false, mobileOnly = false }: TopNavProps = {}) {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const { user, logoutMutation } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    console.log("Desktop toggle sidebar clicked");
    setIsSidebarOpen(!isSidebarOpen);
  };
  


  // If mobileOnly is true, only render the user controls for mobile
  if (mobileOnly) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <LanguageSelector />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center cursor-pointer rounded-full">
              <Avatar className="h-6 w-6 ring-1 ring-offset-1 ring-offset-[#161b2b] ring-blue-100">
                <AvatarImage 
                  src={user?.photo || "https://randomuser.me/api/portraits/men/1.jpg"} 
                  alt={user?.username || "User"} 
                />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user?.photo || "https://randomuser.me/api/portraits/men/1.jpg"} 
                  alt={user?.username || "User"} 
                />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user?.username || "User"}</div>
                <div className="text-sm text-muted-foreground">{user?.email || "user@example.com"}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container max-w-7xl mx-auto flex items-center justify-between h-14">
          {/* Logo and Brand with Menu Button */}
          <div className="flex items-center">
            {/* Desktop Hamburger Menu - Only show if not hidden */}
            {!menuIconHidden && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onMenuButtonClick || toggleSidebar}
                className="text-gray-600 dark:text-gray-300 mr-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="desktop-menu-button"
                aria-label="Toggle Menu"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            )}
            


            <div className="relative flex items-center mr-3">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur-sm opacity-30"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L19 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L5 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="18" r="3" fill="white"/>
                  <path d="M7 10H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div>
              <div className="font-extrabold text-transparent text-lg bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                {t('app.name')}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">{t('app.tagline')}</div>
            </div>
          </div>
          
          {/* Main Navigation - Simplified and Sleeker */}
          <div className="flex items-center space-x-1">
            <Link href="/">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                location === "/" ? "bg-blue-50 dark:bg-blue-900/30 text-primary" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}>
                <Home className="h-5 w-5" />
              </div>
            </Link>
            
            <Link href="/report">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                location === "/report" ? "bg-blue-50 dark:bg-blue-900/30 text-primary" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}>
                <PlusCircle className="h-5 w-5" />
              </div>
            </Link>
            

            <Link href="/my-reports">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-colors relative",
                location === "/my-reports" ? "bg-blue-50 dark:bg-blue-900/30 text-primary" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}>
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
              </div>
            </Link>
          </div>
          
          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            <SmartNotificationBell />

            <LanguageSelector />
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1.5 transition-colors">
                  <Avatar className="h-8 w-8 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-blue-100 dark:ring-blue-800">
                    {user?.photo ? (
                      <AvatarImage 
                        src={user.photo} 
                        alt={user?.username || "User"} 
                      />
                    ) : null}
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <span className="font-medium">{user?.username || "User"}</span>
                  {user?.role && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                      {user.role}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('nav.profile') || 'Profile'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('nav.logout') || 'Logout'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation - Only top bar with language selection */}
      <div className="md:hidden bg-[#161b2b] border-b border-gray-800 shadow-sm">
        <div className="flex items-center px-2 h-16 pt-2">
          {/* Logo */}
          <div className="flex items-center flex-1 min-w-0">
            <div className="relative flex items-center mr-2 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur-sm opacity-30"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-1.5 rounded-full flex items-center justify-center shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L19 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L5 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="18" r="3" fill="white"/>
                  <path d="M7 10H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-white text-sm truncate">
                {t('app.name')}
              </div>
              <div className="text-[8px] text-gray-400 -mt-0.5 truncate">{t('app.tagline')}</div>
            </div>
          </div>
          
          {/* Right Side Controls - Reduced spacing */}
          <div className="flex items-center gap-2 flex-shrink-0">

            <LanguageSelector />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer rounded-full">
                  <Avatar className="h-6 w-6 ring-1 ring-offset-1 ring-offset-[#161b2b] ring-blue-100">
                    {user?.photo ? (
                      <AvatarImage 
                        src={user.photo} 
                        alt={user?.username || "User"} 
                      />
                    ) : null}
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                      <User className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <span className="font-medium">{user?.username || "User"}</span>
                  {user?.role && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                      {user.role}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('nav.profile') || 'Profile'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('nav.logout') || 'Logout'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}