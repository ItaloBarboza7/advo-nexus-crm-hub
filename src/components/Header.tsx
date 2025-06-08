
import { useState, useEffect } from "react";
import { Bell, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lead } from "@/types/lead";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  onLeadSelect?: (lead: Lead) => void;
}

interface UserProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  avatar_url: string;
}

export function Header({ onLeadSelect }: HeaderProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Dr. João Silva",
    title: "Advogado Senior",
    email: "joao.silva@escritorio.com",
    phone: "(11) 99999-9999",
    avatar_url: ""
  });

  // Carregar dados do perfil do usuário
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Recarregar perfil quando o modal é fechado
  useEffect(() => {
    if (!isProfileModalOpen) {
      loadUserProfile();
    }
  }, [isProfileModalOpen]);

  const loadUserProfile = async () => {
    try {
      // Tentar carregar dados do banco de dados primeiro
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        // Fallback para localStorage
        loadFromLocalStorage();
        return;
      }

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setUserProfile({
          name: profile.name || "Dr. João Silva",
          title: profile.title || "Advogado Senior",
          email: profile.email || "joao.silva@escritorio.com",
          phone: profile.phone || "(11) 99999-9999",
          avatar_url: profile.avatar_url || ""
        });
      } else {
        // Fallback para localStorage se não houver perfis no banco
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      // Fallback para localStorage
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        setUserProfile({
          name: profile.name || "Dr. João Silva",
          title: profile.title || "Advogado Senior",
          email: profile.email || "joao.silva@escritorio.com",
          phone: profile.phone || "(11) 99999-9999",
          avatar_url: profile.avatar || ""
        });
      } catch (error) {
        console.error('Erro ao ler localStorage:', error);
      }
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    if (onLeadSelect) {
      onLeadSelect(lead);
    }
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <GlobalSearch onLeadSelect={handleLeadSelect} />
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 dark:hover:bg-gray-700">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userProfile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userProfile.title}</p>
              </div>
              <button
                onClick={handleProfileClick}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                {userProfile.avatar_url ? (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userProfile.avatar_url} alt={userProfile.name} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
