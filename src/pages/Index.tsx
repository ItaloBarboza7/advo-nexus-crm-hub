
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { ClientsContent } from "@/components/ClientsContent";
import { CasesContent } from "@/components/CasesContent";
import { CalendarContent } from "@/components/CalendarContent";
import { SettingsContent } from "@/components/SettingsContent";
import { Header } from "@/components/Header";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { Lead } from "@/types/lead";

export type ActiveView = 'dashboard' | 'clients' | 'cases' | 'calendar' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
    // Mudar para a aba de leads se não estiver nela
    if (activeView !== 'clients') {
      setActiveView('clients');
    }
  };

  const handleEditLead = (lead: Lead) => {
    // Esta função pode ser expandida conforme necessário
    console.log("Edit lead:", lead);
  };

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
    <ThemeProvider defaultTheme="light" storageKey="evojuris-ui-theme">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
          <AppSidebar activeView={activeView} setActiveView={setActiveView} />
          <main className="flex-1 flex flex-col">
            <Header onLeadSelect={handleLeadSelect} />
            <div className="flex-1 p-6">
              {renderContent()}
            </div>
          </main>
          <LeadDetailsDialog
            lead={selectedLead}
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
            onEditLead={handleEditLead}
          />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Index;
