
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [name, setName] = useState("Dr. João Silva");
  const [title, setTitle] = useState("Advogado Senior");
  const [email, setEmail] = useState("joao.silva@escritorio.com");
  const [phone, setPhone] = useState("(11) 99999-9999");
  const [avatar, setAvatar] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Carregar dados do perfil ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      // Tentar carregar dados do banco de dados
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setProfileId(profile.id);
        setName(profile.name || "Dr. João Silva");
        setTitle(profile.title || "Advogado Senior");
        setEmail(profile.email || "joao.silva@escritorio.com");
        setPhone(profile.phone || "(11) 99999-9999");
        setAvatar(profile.avatar_url || "");
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const profileData = {
        name,
        title,
        email,
        phone,
        avatar_url: avatar
      };

      let error;

      if (profileId) {
        // Atualizar perfil existente
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', profileId);
        error = updateError;
      } else {
        // Criar novo perfil
        const { data, error: insertError } = await supabase
          .from('user_profiles')
          .insert([profileData])
          .select()
          .single();
        
        if (data) {
          setProfileId(data.id);
        }
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o perfil. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Também salvar no localStorage como fallback
      localStorage.setItem('userProfile', JSON.stringify({
        name,
        title,
        email,
        phone,
        avatar
      }));

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

      onClose();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Verificar tipo do arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Apenas arquivos de imagem são permitidos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        toast({
          title: "Erro",
          description: "Não foi possível fazer upload da imagem.",
          variant: "destructive",
        });
        return;
      }

      // Obter URL pública da imagem
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (publicUrlData) {
        setAvatar(publicUrlData.publicUrl);
        toast({
          title: "Sucesso",
          description: "Imagem carregada com sucesso!",
        });
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Meus Dados</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-blue-600 text-white text-lg">
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-gray-500">
              {isLoading ? "Carregando..." : "Clique na câmera para alterar a foto"}
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite seu nome completo"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Cargo/Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite seu cargo ou título"
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
                placeholder="Digite seu e-mail"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Digite seu telefone"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
