
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { GlobalSearch } from "./GlobalSearch"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { Lead } from "@/types/lead"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserProfileModal } from "./UserProfileModal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

interface HeaderProps {
  user?: SupabaseUser | null
  onLogout?: () => void
  onLeadSelect?: (lead: Lead) => void
}

interface UserProfile {
  name: string
  avatar_url?: string
}

export function Header({ user, onLogout, onLeadSelect }: HeaderProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "Usuário" })

  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1)

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        return
      }

      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        setUserProfile({
          name: profile.name || "Usuário",
          avatar_url: profile.avatar_url || "",
        })
      } else {
        // Tentar carregar do localStorage como fallback
        const savedProfile = localStorage.getItem('userProfile')
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile)
          setUserProfile({
            name: parsed.name || "Usuário",
            avatar_url: parsed.avatar || "",
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
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

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
        
        <div className="flex-1">
          {onLeadSelect && <GlobalSearch onLeadSelect={onLeadSelect} />}
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                  Editar Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onLogout && (
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => {
          setIsProfileModalOpen(false)
          loadUserProfile() // Recarregar perfil após fechar modal
        }} 
      />
    </>
  )
}
