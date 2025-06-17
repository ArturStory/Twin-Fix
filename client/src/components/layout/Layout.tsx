import React, { useState } from "react";
import TopNav from "./TopNav";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import TranslatedHeader from "@/components/language/TranslatedHeader";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [location] = useLocation();
  
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const closeDesktopMenu = () => setDesktopMenuOpen(false);
  
  // This will be used for the hamburger menu in mobile view
  const toggleMobileMenu = () => {
    console.log("Toggle mobile menu clicked");
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // This will be used for the hamburger menu in desktop view
  const toggleDesktopMenu = () => {
    console.log("Toggle desktop menu clicked");
    setDesktopMenuOpen(!desktopMenuOpen);
  };
  

  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Mobile top navigation bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#161b2b] border-b border-gray-800 shadow-sm z-50">
        <div className="flex items-center justify-between px-3 h-16">
          {/* Left side: Hamburger + Logo */}
          <div className="flex items-center min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMobileMenu}
              className="text-white p-2 mr-2 flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center min-w-0 flex-1">
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
                  Twin Fix
                </div>
                <div className="text-[8px] text-gray-400 -mt-0.5 truncate">Repair Management</div>
              </div>
            </div>
          </div>
          
          {/* Right side: User controls only */}
          <TopNav menuIconHidden={true} mobileOnly={true} />
        </div>
      </div>
      
      {/* Desktop top navigation with hamburger menu and chat button */}
      <div className="hidden md:block">
        <TopNav onMenuButtonClick={toggleDesktopMenu} hideNotificationBell={true} />
      </div>
      
      {/* Account for fixed mobile header */}
      <div className="md:hidden h-16"></div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar component */}
        <Sidebar 
          mobileMenuOpen={mobileMenuOpen} 
          desktopMenuOpen={desktopMenuOpen}
          closeMobileMenu={closeMobileMenu}
          closeDesktopMenu={closeDesktopMenu}
        />
        
        {/* TranslatedHeader temporarily disabled to fix text overlay issues */}
        {/* <TranslatedHeader /> */}
        
        {/* Main content */}
        <main className="flex-1 w-full max-w-none overflow-auto px-4 py-4 md:py-6 mb-16 md:mb-0">
          {children}
        </main>
      </div>
      
      {/* We don't need the floating chat button anymore since we have it in the top bar */}
      
      {/* Bottom navigation for mobile */}
      <MobileBottomNav />
    </div>
  );
}