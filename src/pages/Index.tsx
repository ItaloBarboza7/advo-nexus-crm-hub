
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Header } from "@/components/Header"
import { DashboardContent } from "@/components/DashboardContent"
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

export type ActiveView = 'dashboard' | 'clients' | 'cases' | 'calendar' | 'optimization' | 'settings'

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
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

  const handleLeadSelect = (leadId: string) => {
    // Placeholder for lead selection functionality
    console.log('Lead selected:', leadId)
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
    switch (activeView) {
      case 'dashboard':
        return <DashboardContent />
      case 'cases':
        return <CasesContent />
      case 'clients':
        return <ClientsContent />
      case 'calendar':
        return <CalendarContent />
      case 'optimization':
        return <OptimizationContent />
      case 'settings':
        return <SettingsContent />
      default:
        return <DashboardContent />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} setActiveView={setActiveView} />
      <SidebarInset>
        <Header 
          user={user}
          onLogout={handleLogout}
          onLeadSelect={handleLeadSelect}
        />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Index
