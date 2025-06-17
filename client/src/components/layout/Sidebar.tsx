import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  Home,
  PlusCircle,
  List,
  Map,
  Bell,
  Settings,
  HelpCircle,
  Wrench,
  ClipboardList,
  BarChart,
  Users,
  ClipboardCheck,

} from "lucide-react";

interface SidebarProps {
  mobileMenuOpen: boolean;
  desktopMenuOpen: boolean;
  closeMobileMenu: () => void;
  closeDesktopMenu: () => void;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
  onClick?: () => void;
}

function NavItem({ href, icon, children, badge, onClick }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <div className="mb-1 overflow-hidden">
      <Link 
        href={href}
        onClick={onClick}
      >
        <div
          className={cn(
            "flex items-center px-4 py-3 rounded-lg font-medium relative",
            "transition-all duration-300 ease-in-out",
            "transform hover:translate-x-1",
            isActive 
              ? "text-primary bg-white shadow-sm" 
              : "text-gray-800 hover:bg-white/70"
          )}
        >
          {/* Active indicator line */}
          {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full 
                          animate-pulse transition-all duration-300 ease-in-out"></div>
          )}
          
          {/* Icon with subtle animation */}
          <div className={cn(
            "transform transition-all duration-300 mr-3",
            isActive ? "scale-110 text-primary" : "text-gray-500 group-hover:text-primary"
          )}>
            {icon}
          </div>
          
          {/* Text with transition */}
          <span className={cn(
            "transition-all duration-300 ease-in-out",
            isActive ? "font-semibold" : ""
          )}>
            {children}
          </span>
          
          {/* Badge with pop animation */}
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto bg-primary text-white text-xs px-2 py-1 rounded-full
                           transition-all duration-300 ease-in-out
                           animate-in fade-in zoom-in-95">
              {badge}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function Sidebar({ mobileMenuOpen, desktopMenuOpen, closeMobileMenu, closeDesktopMenu }: SidebarProps) {
  const { t } = useTranslation();
  
  return (
    <>
      {/* Desktop sidebar with yellow vertical stripe on left edge - full size */}
      <aside className={`hidden md:flex flex-col w-72 h-full relative bg-white border-r border-gray-200 p-4 pb-8 ${desktopMenuOpen ? 'md:flex' : 'md:hidden'}`}>
        {/* Yellow vertical stripe - wider and more visible */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-yellow-400"></div>
        <div className="flex items-center mb-8">
          <Wrench className="text-primary text-2xl mr-3" />
          <h1 className="text-xl font-bold text-gray-800">{t("app.name", "Twin Fix")}</h1>
        </div>
        
        <nav className="space-y-1">
          {/* Exact sidebar matching the screenshot */}
          <div>
            <NavItem href="/" icon={<Home className="mr-3 h-5 w-5" />}>
              {t("nav.dashboard", "Dashboard")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/report" icon={<PlusCircle className="mr-3 h-5 w-5" />}>
              {t("nav.reportIssue", "Report Issue")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/my-reports" icon={<List className="mr-3 h-5 w-5" />}>
              {t("nav.myIssues", "My Issues")}
            </NavItem>
          </div>
          

          
          <div>
            <NavItem href="/statistics" icon={<BarChart className="mr-3 h-5 w-5" />}>
              {t("nav.stats", "Statistics")}
            </NavItem>
          </div>
          

          
          <div>
            <NavItem href="/inventory" icon={<Wrench className="mr-3 h-5 w-5" />}>
              {t("nav.inventory", "Inventory")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/inspections" icon={<ClipboardCheck className="mr-3 h-5 w-5" />}>
              {t("nav.inspections", "Inspection Management")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/shared-locations" icon={<Map className="mr-3 h-5 w-5" />}>
              {t("nav.manageLocations", "Manage Locations")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/users" icon={<Users className="mr-3 h-5 w-5" />}>
              {t("nav.userManagement", "User Management")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/settings" icon={<Settings className="mr-3 h-5 w-5" />}>
              {t("nav.settings", "Settings")}
            </NavItem>
          </div>
          
          <div>
            <NavItem href="/help" icon={<HelpCircle className="mr-3 h-5 w-5" />}>
              {t("nav.helpSupport", "Help & Support")}
            </NavItem>
          </div>
        </nav>
        
        {/* Footer section removed to avoid duplicate menu items */}
      </aside>

      {/* Mobile menu (off-canvas) */}
      <div 
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 ease-in-out",
          mobileMenuOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop with blur effect */}
        <div 
          className={cn(
            "absolute inset-0 bg-gray-600/80 backdrop-blur-sm transition-opacity duration-300",
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeMobileMenu}
        ></div>
        
        {/* Sliding sidebar panel */}
        <div 
          className={cn(
            "absolute inset-y-0 left-0 max-w-xs w-full bg-white flex flex-col shadow-xl",
            "transition-transform duration-300 ease-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center animate-in fade-in slide-in-from-left duration-500">
              <Wrench className="text-primary text-2xl mr-3" />
              <h1 className="text-xl font-bold text-gray-800">{t("app.name", "Twin Fix")}</h1>
            </div>
            <button 
              onClick={closeMobileMenu} 
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md
                         transition-all duration-200 ease-in-out hover:rotate-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Mobile menu items matching the desktop sidebar */}
            <div>
              <NavItem 
                href="/" 
                icon={<Home className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.dashboard", "Dashboard")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/report" 
                icon={<PlusCircle className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.reportIssue", "Report Issue")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/my-reports" 
                icon={<List className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.myIssues", "My Issues")}
              </NavItem>
            </div>
            

            
            <div>
              <NavItem 
                href="/statistics" 
                icon={<BarChart className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.stats", "Statistics")}
              </NavItem>
            </div>
            

            
            <div>
              <NavItem 
                href="/inventory" 
                icon={<Wrench className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.inventory", "Inventory")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/inspections" 
                icon={<ClipboardCheck className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.inspections", "Inspection Management")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/shared-locations" 
                icon={<Map className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.manageLocations", "Manage Locations")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/users" 
                icon={<Users className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.userManagement", "User Management")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/settings" 
                icon={<Settings className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.settings", "Settings")}
              </NavItem>
            </div>
            
            <div>
              <NavItem 
                href="/help" 
                icon={<HelpCircle className="mr-3 h-5 w-5" />}
                onClick={closeMobileMenu}
              >
                {t("nav.helpSupport", "Help & Support")}
              </NavItem>
            </div>
          </nav>
          {/* Footer removed since these items are already in the main mobile nav */}
        </div>
      </div>
    </>
  );
}
