import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Menu, PlusCircle, Wrench } from "lucide-react";

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export default function Header({ toggleMobileMenu }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleMobileMenu}
          className="text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <div className="flex items-center">
          <div className="relative mr-3 flex items-center">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-md blur-sm opacity-30"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-1.5 rounded-md flex items-center justify-center shadow-md">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L19 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3L5 10L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="18" r="3" fill="white"/>
                <path d="M7 10H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div>
            <div className="font-extrabold text-transparent text-lg bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Twin Fix
            </div>
            <div className="text-xs text-gray-500 -mt-1">Repair Management</div>
          </div>
        </div>
      </div>
      
      <div className="hidden md:block max-w-md">
        <div className="relative">
          <PlusCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            type="text" 
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64" 
            placeholder="Search reports..." 
          />
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="ml-4 flex items-center">
          <Avatar>
            <AvatarImage src="https://randomuser.me/api/portraits/men/1.jpg" alt="User avatar" />
            <AvatarFallback>JS</AvatarFallback>
          </Avatar>
          <span className="ml-2 font-medium text-sm hidden md:block">Jamie Smith</span>
        </div>
      </div>
    </header>
  );
}
