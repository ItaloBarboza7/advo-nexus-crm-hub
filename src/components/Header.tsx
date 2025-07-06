import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { GlobalSearch } from "./GlobalSearch"
import { Button } from "@/components/ui/button"
import { LogOut, User, Settings } from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { Lead } from "@/types/lead"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserProfileModal } from "./UserProfileModal"
import { LeadDialogs } from "./analysis/LeadDialogs"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useCompanyInfo } from "@/hooks/useCompanyInfo"
import { useLeadDialogs } from "@/hooks/useLeadDialogs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  user?: SupabaseUser | null
  onLogout?: () => void
  onLeadSelect?: (lead: Lead) => void
}

interface UserProfile {
  name: string
  avatar_url?: string
}

export function Header({ user, onLogout }: HeaderProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Usuário" })
  const { companyInfo, refreshCompanyInfo } = useCompanyInfo()
  
  // Integrar com o sistema de diálogos de leads
  const {
    selectedLead,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    isEditFormOpen,
    setIsEditFormOpen,
    handleViewDetails,
    handleEditLead
  } = useLeadDialogs()

  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  // Real-time subscription para mudanças no perfil
  useEffect(() => {
    if (!user) return;

    const setupRealtimeSync = async () => {
      console.log('[Header] Configurando sincronização em tempo real');
      
      const channel = supabase
        .channel('header_profile_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Header] Mudança no perfil detectada:', payload);
            loadUserProfile();
          }
        )
        .subscribe();

      return () => {
        console.log('[Header] Removendo subscription');
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    
    setupRealtimeSync().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [user]);

  const loadUserProfile = async () => {
    try {
      // Obter o usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) return

      console.log('[Header] Carregando perfil do usuário:', currentUser.id)

      // Buscar perfil do usuário atual no banco usando RLS
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (error) {
        console.error('[Header] Erro ao carregar perfil:', error)
      }

      if (profile) {
        console.log('[Header] Perfil encontrado no banco:', profile)
        setUserProfile({
          name: profile.name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || "Usuário",
          avatar_url: profile.avatar_url || "",
        })
      } else {
        // Se não há perfil no banco, usar dados dos metadados do usuário
        console.log('[Header] Nenhum perfil encontrado, usando metadados')
        setUserProfile({
          name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || "Usuário",
          avatar_url: "",
        })
      }
    } catch (error) {
      console.error('[Header] Erro ao carregar perfil:', error)
      // Fallback para dados do usuário atual
      if (user) {
        setUserProfile({
          name: user.user_metadata?.name || user.email?.split('@')[0] || "Usuário",
          avatar_url: "",
        })
      }
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const handleProfileModalClose = async () => {
    console.log('[Header] Modal do perfil fechado');
    setIsProfileModalOpen(false);
  }

  const handleProfileClick = async () => {
    console.log('[Header] Clique no perfil - abrindo modal');
    setIsProfileModalOpen(true);
  }

  // Função para lidar com a seleção de lead da pesquisa global
  const handleLeadSelectFromSearch = (lead: Lead) => {
    console.log('[Header] Lead selecionado da pesquisa global:', lead.name);
    handleViewDetails(lead);
  }

  // Função para simular refresh de dados após edição
  const handleLeadUpdated = () => {
    console.log('[Header] Lead atualizado - dados podem ser atualizados');
    // Aqui você poderia adicionar lógica para atualizar dados se necessário
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
        
        <div className="flex-1">
          <GlobalSearch onLeadSelect={handleLeadSelectFromSearch} />
        </div>
        
        {user && (
          <div className="flex items-center gap-3 px-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 p-2 h-auto hover:bg-muted/50"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(userProfile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="font-medium text-sm">{userProfile.name}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onLogout && (
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={handleProfileModalClose}
      />

      <LeadDialogs
        selectedLead={selectedLead}
        isDetailsDialogOpen={isDetailsDialogOpen}
        setIsDetailsDialogOpen={setIsDetailsDialogOpen}
        isEditFormOpen={isEditFormOpen}
        setIsEditFormOpen={setIsEditFormOpen}
        onEditLead={handleEditLead}
        onLeadUpdated={handleLeadUpdated}
      />
    </>
  )
}
