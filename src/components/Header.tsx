
import { Bell, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Lead } from "@/types/lead";

interface HeaderProps {
  onLeadSelect?: (lead: Lead) => void;
}

export function Header({ onLeadSelect }: HeaderProps) {
  const handleLeadSelect = (lead: Lead) => {
    if (onLeadSelect) {
      onLeadSelect(lead);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <GlobalSearch onLeadSelect={handleLeadSelect} />
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 dark:hover:bg-gray-700">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dr. João Silva</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Advogado Senior</p>
            </div>
            <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-full">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
