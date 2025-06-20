
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { companyInfo, updateCompanyInfo, refreshCompanyInfo } = useCompanyInfo();

  // Carregar perfil quando modal abre
  useEffect(() => {
    if (isOpen) {
      console.log('[UserProfileModal] Modal aberto, carregando perfil');
      loadUserProfile();
    }
  }, [isOpen, companyInfo]);

  // NOVO: Recarregar dados quando companyInfo muda (apenas se modal estiver aberto)
  useEffect(() => {
    if (isOpen && companyInfo) {
      console.log('[UserProfileModal] CompanyInfo mudou enquanto modal estava aberto, recarregando dados');
      loadUserProfile();
    }
  }, [companyInfo]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('[UserProfileModal] Carregando perfil para usuário:', user.id);
      console.log('[UserProfileModal] Dados da empresa disponíveis:', companyInfo);

      // Buscar perfil do usuário atual no banco usando RLS
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[UserProfileModal] Erro ao carregar perfil:', error);
        toast({
          title: "Erro",
          description: `Erro ao carregar perfil: ${error.message}`,
          variant: "destructive",
        });
      }

      if (profile) {
        console.log('[UserProfileModal] Perfil encontrado no banco:', profile);
        setName(profile.name || "");
        setAvatar(profile.avatar_url || "");
        
        // Usar dados da empresa se disponíveis, senão usar dados do perfil
        if (companyInfo) {
          console.log('[UserProfileModal] Usando dados da empresa para email e telefone');
          setEmail(companyInfo.email || user.email || "");
          setPhone(companyInfo.phone || profile.phone || "");
        } else {
          console.log('[UserProfileModal] Usando dados do perfil para email e telefone');
          setEmail(profile.email || user.email || "");
          setPhone(profile.phone || "");
        }
      } else {
        // Se não há perfil no banco, usar dados dos metadados do usuário
        console.log('[UserProfileModal] Nenhum perfil no banco, usando metadados do usuário');
        setName(user.user_metadata?.name || "");
        setAvatar("");
        
        // Usar dados da empresa se disponíveis
        if (companyInfo) {
          console.log('[UserProfileModal] Usando dados da empresa (sem perfil no banco)');
          setEmail(companyInfo.email || user.email || "");
          setPhone(companyInfo.phone || user.user_metadata?.phone || "");
        } else {
          console.log('[UserProfileModal] Usando metadados do usuário (sem perfil e sem empresa)');
          setEmail(user.email || "");
          setPhone(user.user_metadata?.phone || "");
        }
      }
    } catch (error) {
      console.error('[UserProfileModal] Erro inesperado ao carregar perfil:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      console.log('[UserProfileModal] Tentando salvar perfil para usuário:', user.id);

      // Verificar se já existe um perfil para este usuário
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[UserProfileModal] Erro ao verificar perfil existente:', checkError);
        toast({
          title: "Erro",
          description: `Erro ao verificar perfil: ${checkError.message}`,
          variant: "destructive",
        });
        return;
      }

      const profileData = {
        user_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatar.trim() || null,
      };

      let saveError;
      if (existingProfile) {
        // Atualizar perfil existente
        console.log('[UserProfileModal] Atualizando perfil existente...');
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        saveError = error;
      } else {
        // Criar novo perfil
        console.log('[UserProfileModal] Criando novo perfil...');
        const { error } = await supabase
          .from('user_profiles')
          .insert(profileData);
        saveError = error;
      }

      if (saveError) {
        console.error('[UserProfileModal] Erro ao salvar perfil:', saveError);
        toast({
          title: "Erro",
          description: `Não foi possível salvar o perfil: ${saveError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Atualizar informações da empresa se existirem
      if (companyInfo) {
        console.log('[UserProfileModal] Atualizando informações da empresa com novo email e telefone...');
        const companyUpdateSuccess = await updateCompanyInfo({
          company_name: companyInfo.company_name,
          cnpj: companyInfo.cnpj,
          phone: phone.trim(),
          email: email.trim(),
          address: companyInfo.address
        });

        if (!companyUpdateSuccess) {
          // Se falhou ao atualizar empresa, mostrar aviso mas não bloquear
          toast({
            title: "Aviso",
            description: "Perfil salvo, mas houve problema ao sincronizar com informações da empresa.",
            variant: "destructive",
          });
        } else {
          // Garantir que as informações sejam atualizadas
          console.log('[UserProfileModal] Forçando atualização das informações da empresa após salvamento...');
          refreshCompanyInfo();
        }
      }

      console.log('[UserProfileModal] Perfil salvo com sucesso!');
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

      // Disparar evento para notificar outros componentes
      console.log('[UserProfileModal] Disparando evento userProfileUpdated após salvamento');
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));

      onClose();
    } catch (error) {
      console.error('[UserProfileModal] Erro inesperado ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Perfil do Usuário</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(name || "U")}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
                onClick={() => {
                  // TODO: Implementar upload de imagem
                  toast({
                    title: "Em desenvolvimento",
                    description: "Funcionalidade de upload será implementada em breve.",
                  });
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Pessoais</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                * Alterações aqui também afetarão as informações da empresa
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                * Alterações aqui também afetarão as informações da empresa
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
