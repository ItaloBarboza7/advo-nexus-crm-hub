
import { Home, Users, Flag, TrendingUp, Settings, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { ActiveView } from "@/pages/Index";

interface AppSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  userRole: string | null;
}

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    view: "dashboard" as ActiveView,
  },
  {
    title: "Leads",
    icon: Users,
    view: "clients" as ActiveView,
  },
  {
    title: "Análises",
    icon: TrendingUp,
    view: "cases" as ActiveView,
  },
  {
    title: "Metas",
    icon: Flag,
    view: "calendar" as ActiveView,
  },
  {
    title: "Otimização",
    icon: Zap,
    view: "optimization" as ActiveView,
  },
  {
    title: "Configurações",
    icon: Settings,
    view: "settings" as ActiveView,
  },
];

export function AppSidebar({ activeView, setActiveView, userRole }: AppSidebarProps) {
  const visibleMenuItems = menuItems.filter(item => {
    if (item.view === 'settings') {
      return userRole !== 'member';
    }
    return true;
  });

  return (
    <Sidebar className="border-r border-gray-200 dark:border-gray-800">
      <SidebarHeader className="border-b border-gray-200 dark:border-gray-800 px-6 py-2">
        <div className="flex items-center justify-center">
          <img 
            src="/lovable-uploads/cdf6d547-b3db-49aa-a10e-22232822a77e.png" 
            alt="EVOJURIS Logo" 
            className="h-20"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-600 dark:text-gray-400 font-medium px-3 py-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeView === item.view}
                    onClick={() => setActiveView(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activeView === item.view
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
