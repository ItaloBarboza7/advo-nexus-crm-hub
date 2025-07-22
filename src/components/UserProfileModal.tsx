import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { uploadAvatar, deleteAvatar } from "@/utils/avatarUpload";

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { companyInfo, updateCompanyInfo, refreshCompanyInfo } = useCompanyInfo();

  // Carregar perfil quando modal abre
  useEffect(() => {
    if (isOpen) {
      console.log('[UserProfileModal] Modal aberto, carregando perfil');
      loadUserProfile();
    }
  }, [isOpen]);

  // Real-time subscription para mudanças na empresa
  useEffect(() => {
    if (!isOpen) return;

    const setupRealtimeSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('[UserProfileModal] Configurando sincronização em tempo real');
      
      const channel = supabase
        .channel('user_profile_company_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'company_info',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[UserProfileModal] Mudança na empresa detectada:', payload);
            if (payload.new && typeof payload.new === 'object') {
              const newData = payload.new as any;
              console.log('[UserProfileModal] Atualizando campos com dados da empresa:', newData);
              setEmail(newData.email || "");
              setPhone(newData.phone || "");
            }
          }
        )
        .subscribe();

      return () => {
        console.log('[UserProfileModal] Removendo subscription');
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
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('[UserProfileModal] Carregando perfil para usuário:', user.id);

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
        return;
      }

      if (profile) {
        console.log('[UserProfileModal] Perfil encontrado no banco:', profile);
        setName(profile.name || "");
        setAvatar(profile.avatar_url || "");
        
        // Priorizar dados da empresa se disponíveis
        if (companyInfo) {
          console.log('[UserProfileModal] Usando dados da empresa para email e telefone');
          setEmail(companyInfo.email || user.email || "");
          setPhone(companyInfo.phone || "");
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

      // Guardar o email original para comparação
      setOriginalEmail(user.email || "");
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
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

      // Delete old avatar if exists
      if (avatar) {
        await deleteAvatar(avatar, user.id);
      }

      // Upload new avatar
      const avatarUrl = await uploadAvatar(file, user.id);
      if (avatarUrl) {
        setAvatar(avatarUrl);
        toast({
          title: "Avatar atualizado",
          description: "Sua foto de perfil foi atualizada com sucesso.",
        });
      } else {
        toast({
          title: "Erro no upload",
          description: "Não foi possível fazer o upload da imagem. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[UserProfileModal] Erro no upload do avatar:', error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro inesperado ao fazer o upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      // Se o email foi alterado, usar a Edge Function para atualizar o email de autenticação
      if (email.trim() !== originalEmail) {
        console.log('[UserProfileModal] Email alterado, atualizando via Edge Function');
        const { data, error } = await supabase.functions.invoke('update-user-email', {
          body: { 
            newEmail: email.trim()
          },
        });

        if (error) {
          console.error('[UserProfileModal] Erro da Edge Function:', error);
          throw new Error(error.message);
        }
        
        if (data.error) {
          console.error('[UserProfileModal] Erro retornado pela função:', data.error);
          toast({
            title: "Erro ao atualizar email",
            description: data.error,
            variant: "destructive",
          });
          return;
        }

        console.log('[UserProfileModal] Email de autenticação atualizado com sucesso');
      }

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
        }
      }

      console.log('[UserProfileModal] Perfil salvo com sucesso!');
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso. Se você alterou o email, faça login novamente com o novo email.",
      });

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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <Upload className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Clique no ícone da câmera para alterar sua foto
              <br />
              Máximo: 5MB • Formatos: JPG, PNG, GIF
            </p>
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
