
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EditCompanyModal } from "./EditCompanyModal";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Separator } from "@/components/ui/separator";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { companyInfo, isLoading: isCompanyLoading, updateCompanyInfo } = useCompanyInfo();

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
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
        setName(profile.name || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
        setTitle(profile.title || "");
        setAvatar(profile.avatar_url || "");
      } else {
        // Tentar carregar do localStorage como fallback
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setName(parsed.name || "");
          setEmail(parsed.email || "");
          setPhone(parsed.phone || "");
          setTitle(parsed.title || "");
          setAvatar(parsed.avatar || "");
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
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
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          title: title.trim() || null,
          avatar_url: avatar.trim() || null,
        });

      if (error) {
        console.error('Erro ao salvar perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o perfil.",
          variant: "destructive",
        });
        return;
      }

      // Salvar também no localStorage como backup
      localStorage.setItem('userProfile', JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim(),
        avatar: avatar.trim(),
      }));

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

      onClose();
    } catch (error) {
      console.error('Erro inesperado ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao salvar o perfil.",
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
    <>
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
                <Label htmlFor="name">Nome *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Cargo</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Seu cargo na empresa"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Separator />

            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Informações da Empresa</h3>
                <Button
                  variant="outline"
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="gap-2"
                  disabled={isCompanyLoading}
                >
                  <Building2 className="h-4 w-4" />
                  {companyInfo ? "Editar" : "Cadastrar"}
                </Button>
              </div>

              {companyInfo ? (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Empresa:</span>
                      <p className="text-muted-foreground">{companyInfo.company_name}</p>
                    </div>
                    <div>
                      <span className="font-medium">CNPJ:</span>
                      <p className="text-muted-foreground">{companyInfo.cnpj}</p>
                    </div>
                    <div>
                      <span className="font-medium">Telefone:</span>
                      <p className="text-muted-foreground">{companyInfo.phone}</p>
                    </div>
                    <div>
                      <span className="font-medium">E-mail:</span>
                      <p className="text-muted-foreground">{companyInfo.email}</p>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Endereço:</span>
                    <p className="text-muted-foreground text-sm">{companyInfo.address}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-muted-foreground text-sm">
                    Nenhuma informação da empresa cadastrada
                  </p>
                </div>
              )}
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
        </DialogContent>
      </Dialog>

      <EditCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        companyInfo={companyInfo}
        onSave={updateCompanyInfo}
        isLoading={isCompanyLoading}
      />
    </>
  );
}
