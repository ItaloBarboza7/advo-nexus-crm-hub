
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Header } from "@/components/Header"
import { DashboardContent } from "@/components/DashboardContent"
import { OptimizationContent } from "@/components/OptimizationContent"
import { CalendarContent } from "@/components/CalendarContent"
import { CasesContent } from "@/components/CasesContent"
import { ClientsContent } from "@/components/ClientsContent"
import { SettingsContent } from "@/components/SettingsContent"
import { CompanyInfoModal } from "@/components/CompanyInfoModal"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { User, Session } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Lead } from "@/types/lead"
import { useTenantSchema } from "@/hooks/useTenantSchema"

export type ActiveView = 'dashboard' | 'clients' | 'cases' | 'calendar' | 'optimization' | 'settings'

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const { ensureTenantSchema } = useTenantSchema()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          checkFirstLoginAndCompanyInfo(session.user)
        } else {
          setUserRole(null)
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        checkFirstLoginAndCompanyInfo(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkFirstLoginAndCompanyInfo = async (user: User) => {
    try {
      // Primeiro, garantir que o esquema do tenant existe
      console.log("🏗️ Index - Garantindo esquema do tenant...");
      await ensureTenantSchema();

      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (roleError) {
        console.error('❌ Erro ao verificar cargo do usuário:', roleError)
        setUserRole(null)
        return
      }

      let role = userRoleData?.role

      if (!role) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('parent_user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData && !profileData.parent_user_id && !profileError) {
          console.log(`👤 Usuário ${user.id} está sem cargo. Atribuindo cargo 'admin'.`);
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' });

          if (insertError) {
            console.error('❌ Erro ao atribuir cargo de admin:', insertError);
          } else {
            role = 'admin';
            console.log(`✅ Cargo 'admin' atribuído com sucesso para o usuário ${user.id}.`);
          }
        }
      }

      setUserRole(role || null)

      if (role === 'member') {
        return
      }
      
      const isFirstLogin = user.user_metadata?.is_first_login === true

      // Verificar informações da empresa no esquema do tenant
      console.log("🏢 Index - Verificando informações da empresa no esquema do tenant...");
      
      try {
        const { data: companyInfo, error } = await supabase.rpc('exec_sql', {
          sql: `SELECT id FROM ${await ensureTenantSchema()}.company_info LIMIT 1`
        });

        if (error) {
          console.error('❌ Erro ao verificar informações da empresa:', error)
          return
        }

        console.log(`✅ Index - ${(companyInfo || []).length} empresa(s) encontrada(s) no esquema do tenant`);

        if (isFirstLogin || !companyInfo || companyInfo.length === 0) {
          setShowCompanyModal(true)
          
          if (isFirstLogin) {
            await supabase.auth.updateUser({
              data: { 
                ...user.user_metadata,
                is_first_login: false 
              }
            })
          }
        }
      } catch (error) {
        console.error('❌ Erro ao verificar empresa no esquema do tenant:', error)
        // Se houver erro ao verificar a empresa, mostrar modal mesmo assim
        setShowCompanyModal(true)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar primeiro login e informações da empresa:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleLeadSelect = (lead: Lead) => {
    console.log('🎯 Lead selected:', lead)
  }

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
        if (userRole === 'member') {
          return <DashboardContent />
        }
        return <SettingsContent />
      default:
        return <DashboardContent />
    }
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar activeView={activeView} setActiveView={setActiveView} userRole={userRole} />
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

      <CompanyInfoModal 
        isOpen={showCompanyModal} 
        onClose={() => setShowCompanyModal(false)} 
      />
    </>
  )
}

export default Index
