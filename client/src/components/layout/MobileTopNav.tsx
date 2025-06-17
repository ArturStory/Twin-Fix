import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LanguageSelector from "@/components/common/LanguageSelector";
import { Bell, MessageSquare, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MobileTopNav() {
  const { t } = useTranslation();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="md:hidden">
      {/* Main navigation bar */}
      <div className="bg-[#161b2b] border-b border-gray-800 shadow-sm">
        <div className="flex items-center px-3 h-14">
          {/* Logo */}
          <div className="flex items-center flex-1">
            <div className="relative flex items-center mr-2">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur-sm opacity-30"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-1.5 rounded-full flex items-center justify-center shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L19 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L5 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="18" r="3" fill="white"/>
                  <path d="M7 10H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div>
              <div className="font-extrabold text-transparent text-base bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                {t('app.name')}
              </div>
              <div className="text-[9px] text-gray-500 dark:text-gray-400 -mt-1">{t('app.tagline')}</div>
            </div>
          </div>
          
          {/* Notification Icons - in the top bar */}
          <div className="flex items-center gap-4">
            <Link href="/notifications" className="text-white hover:text-blue-400 transition-colors">
              <Bell size={18} />
            </Link>
            
            <Link href="/messaging" className="text-white hover:text-blue-400 transition-colors">
              <MessageSquare size={18} />
            </Link>
            
            <LanguageSelector />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer rounded-full">
                  <Avatar className="h-7 w-7 ring-1 ring-offset-2 ring-offset-[#161b2b] ring-blue-100">
                    {user?.photo ? (
                      <AvatarImage 
                        src={user.photo} 
                        alt={user?.username || "User"} 
                      />
                    ) : null}
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                      <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
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
    </div>
  );
}