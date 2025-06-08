
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Header } from "@/components/Header"
import { DashboardContent } from "@/components/DashboardContent"
import { LeadsListView } from "@/components/LeadsListView"
import { KanbanView } from "@/components/KanbanView"
import { AnalysisContent } from "@/components/analysis/AnalysisContent"
import { OptimizationContent } from "@/components/OptimizationContent"
import { CalendarContent } from "@/components/CalendarContent"
import { CasesContent } from "@/components/CasesContent"
import { ClientsContent } from "@/components/ClientsContent"
import { SettingsContent } from "@/components/SettingsContent"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { User, Session } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

const Index = () => {
  const [currentView, setCurrentView] = useState('dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // If not authenticated, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Bem-vindo ao CRM</h1>
          <p className="text-lg text-muted-foreground">Faça login para acessar o sistema</p>
          <Link to="/login">
            <Button size="lg">Fazer Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardContent />
      case 'leads-list':
        return <LeadsListView />
      case 'kanban':
        return <KanbanView />
      case 'analysis':
        return <AnalysisContent />
      case 'optimization':
        return <OptimizationContent />
      case 'calendar':
        return <CalendarContent />
      case 'cases':
        return <CasesContent />
      case 'clients':
        return <ClientsContent />
      case 'settings':
        return <SettingsContent />
      default:
        return <DashboardContent />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
      <SidebarInset>
        <Header 
          user={user}
          onLogout={handleLogout}
        />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Index
