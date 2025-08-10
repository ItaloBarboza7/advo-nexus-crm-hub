
import { Home, Users, Flag, TrendingUp, Settings, Zap, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { ActiveView } from "@/pages/Index";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useSubscriptionControl } from "@/hooks/useSubscriptionControl";

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
    feature: "create_lead"
  },
  {
    title: "Análises",
    icon: TrendingUp,
    view: "cases" as ActiveView,
    requiresPermission: 'analysis_access',
    feature: "analysis_access"
  },
  {
    title: "Metas",
    icon: Flag,
    view: "calendar" as ActiveView,
    feature: "calendar_access"
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
    feature: "settings_access"
  },
];

export function AppSidebar({ activeView, setActiveView, userRole }: AppSidebarProps) {
  const { getCurrentUserPermission } = useUserPermissions();
  const { canAccessFeature } = useSubscriptionControl();
  const [hasAnalysisAccess, setHasAnalysisAccess] = useState(false);

  useEffect(() => {
    const checkAnalysisPermission = async () => {
      const hasAccess = await getCurrentUserPermission('analysis_access');
      setHasAnalysisAccess(hasAccess);
    };

    checkAnalysisPermission();
  }, [getCurrentUserPermission]);

  const visibleMenuItems = menuItems.filter(item => {
    // Configurações só para não-membros
    if (item.view === 'settings') {
      return userRole !== 'member';
    }
    
    // Análises só para quem tem permissão
    if (item.requiresPermission === 'analysis_access') {
      return hasAnalysisAccess;
    }
    
    return true;
  });

  return (
    <Sidebar className="border-r border-gray-200 dark:border-gray-800">
      <SidebarHeader className="px-0 py-0">
        <div className="flex items-center justify-center overflow-hidden">
          <img 
            src="/lovable-uploads/cdf6d547-b3db-49aa-a10e-22232822a77e.png" 
            alt="EVOJURIS Logo" 
            className="h-48 w-auto object-cover scale-125 -my-6"
            style={{
              clipPath: 'inset(15% 8% 15% 8%)'
            }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const hasFeatureAccess = !item.feature || canAccessFeature(item.feature);
                const isBlocked = item.feature && !hasFeatureAccess;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={activeView === item.view}
                      onClick={() => setActiveView(item.view)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        activeView === item.view
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600"
                          : isBlocked
                          ? "text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isBlocked ? 'opacity-50' : ''}`} />
                      <span className={`font-medium ${isBlocked ? 'opacity-50' : ''}`}>
                        {item.title}
                      </span>
                      {isBlocked && <Lock className="h-3 w-3 ml-auto opacity-50" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
