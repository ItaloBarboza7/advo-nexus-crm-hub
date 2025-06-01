
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { ClientsContent } from "@/components/ClientsContent";
import { CasesContent } from "@/components/CasesContent";
import { CalendarContent } from "@/components/CalendarContent";
import { SettingsContent } from "@/components/SettingsContent";
import { Header } from "@/components/Header";

export type ActiveView = 'dashboard' | 'clients' | 'cases' | 'calendar' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardContent />;
      case 'clients':
        return <ClientsContent />;
      case 'cases':
        return <CasesContent />;
      case 'calendar':
        return <CalendarContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
