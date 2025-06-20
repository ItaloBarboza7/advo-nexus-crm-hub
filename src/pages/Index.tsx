
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { DashboardContent } from "@/components/DashboardContent";
import { ClientsContent } from "@/components/ClientsContent";
import { CasesContent } from "@/components/CasesContent";
import { CalendarContent } from "@/components/CalendarContent";
import { SettingsContent } from "@/components/SettingsContent";
import { OptimizationContent } from "@/components/OptimizationContent";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@/types/lead";

export type ActiveView = "dashboard" | "clients" | "cases" | "calendar" | "settings" | "optimization";

export default function Index() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return data?.role || 'owner';
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setActiveView("clients");
  };

  const handleUserProfileUpdate = () => {
    // Recarregar perfil do usuário no header quando as informações forem atualizadas
    if (window.refreshUserProfile) {
      window.refreshUserProfile();
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardContent />;
      case "clients":
        return <ClientsContent selectedLead={selectedLead} onClearSelection={() => setSelectedLead(null)} />;
      case "cases":
        return <CasesContent />;
      case "calendar":
        return <CalendarContent />;
      case "settings":
        return <SettingsContent onUserProfileUpdate={handleUserProfileUpdate} />;
      case "optimization":
        return <OptimizationContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          activeView={activeView} 
          setActiveView={setActiveView}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col">
          <Header 
            user={user} 
            onLogout={handleLogout} 
            onLeadSelect={handleLeadSelect}
          />
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
