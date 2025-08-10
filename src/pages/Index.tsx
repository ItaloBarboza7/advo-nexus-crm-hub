
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { DashboardContent } from "@/components/DashboardContent";
import { LeadsListView } from "@/components/LeadsListView";
import { SettingsContent } from "@/components/SettingsContent";
import { CalendarContent } from "@/components/CalendarContent";
import { CasesContent } from "@/components/CasesContent";
import { ClientsContent } from "@/components/ClientsContent";
import { GlobalSearch } from "@/components/GlobalSearch";
import { TeamGoalsSettings } from "@/components/TeamGoalsSettings";
import { SubscriptionProtectedWrapper } from "@/components/SubscriptionProtectedWrapper";
import { BlockedContent } from "@/components/BlockedContent";
import { OptimizationContent } from "@/components/OptimizationContent";
import { AgendaContent } from "@/components/AgendaContent";
import { AtendimentoContent } from "@/components/AtendimentoContent";

export default function Index() {
  const location = useLocation();

  const renderContent = () => {
    switch (location.pathname) {
      case "/":
        return <DashboardContent />;
      case "/atendimento":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <AtendimentoContent />
          </SubscriptionProtectedWrapper>
        );
      case "/leads":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <LeadsListView />
          </SubscriptionProtectedWrapper>
        );
      case "/clientes":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <ClientsContent />
          </SubscriptionProtectedWrapper>
        );
      case "/casos":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <CasesContent />
          </SubscriptionProtectedWrapper>
        );
      case "/calendario":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <CalendarContent />
          </SubscriptionProtectedWrapper>
        );
      case "/pesquisa-global":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <GlobalSearch />
          </SubscriptionProtectedWrapper>
        );
      case "/metas":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <TeamGoalsSettings />
          </SubscriptionProtectedWrapper>
        );
      case "/agenda":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <AgendaContent />
          </SubscriptionProtectedWrapper>
        );
      case "/otimizacao":
        return (
          <SubscriptionProtectedWrapper fallback={<BlockedContent />}>
            <OptimizationContent />
          </SubscriptionProtectedWrapper>
        );
      case "/configuracoes":
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
