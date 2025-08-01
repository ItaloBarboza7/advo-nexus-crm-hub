
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyInfoModal({ isOpen, onClose }: CompanyInfoModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [originalAuthEmail, setOriginalAuthEmail] = useState("");
  
  const { stateOptions } = useFilterOptions();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserInfo = async () => {
      if (isOpen) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            console.log("🔍 CompanyInfoModal - Email de autenticação original:", user.email);
            setOriginalAuthEmail(user.email);
            setEmail(user.email); // Começar com o email atual
          }
        } catch (error) {
          console.error("❌ Erro ao carregar informações do usuário:", error);
        }
      }
    };

    loadUserInfo();
  }, [isOpen]);

  const handleSave = async () => {
    if (!companyName || !cnpj || !phone || !email || !cep || !address || !neighborhood || !city || !state) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("💾 CompanyInfoModal - Iniciando salvamento das informações da empresa");
      console.log("📧 Emails para comparação:", {
        originalAuthEmail,
        newEmail: email.trim(),
        isDifferent: email.trim() !== originalAuthEmail
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Se o email é diferente do email de autenticação original, atualizar via Edge Function
      if (email.trim() !== originalAuthEmail && originalAuthEmail) {
        console.log("🔄 CompanyInfoModal - Email diferente detectado, atualizando email de autenticação");
        
        const { data, error } = await supabase.functions.invoke('update-user-email', {
          body: { 
            newEmail: email.trim()
          },
        });

        if (error) {
          console.error("❌ Erro da Edge Function:", error);
          throw new Error(`Erro ao atualizar email de login: ${error.message}`);
        }
        
        if (data?.error) {
          console.error("❌ Erro retornado pela função:", data.error);
          throw new Error(`Erro ao atualizar email de login: ${data.error}`);
        }

        console.log("✅ Email de autenticação atualizado com sucesso");
      }

      // Montar o endereço completo
      const fullAddress = `${address}, ${neighborhood}, ${city}, ${state}, CEP: ${cep}`;

      // Salvar informações da empresa
      const { error: companyError } = await supabase
        .from('company_info')
        .insert({
          company_name: companyName,
          cnpj,
          phone,
          email: email.trim(),
          address: fullAddress,
        });

      if (companyError) {
        console.error("❌ Erro ao salvar informações da empresa:", companyError);
        throw new Error(`Erro ao salvar informações da empresa: ${companyError.message}`);
      }

      // Atualizar perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          email: email.trim(),
          phone,
        });

      if (profileError) {
        console.error("❌ Erro ao atualizar perfil:", profileError);
        // Não falhar aqui, apenas avisar
        console.warn("Aviso: Não foi possível atualizar o perfil do usuário");
      }

      // Atualizar metadados do usuário para marcar como completo
      await supabase.auth.updateUser({
        data: { 
          company_info_completed: true,
          is_first_login: false 
        }
      });

      console.log("✅ CompanyInfoModal - Informações salvas com sucesso");

      // Mostrar mensagem apropriada
      const successMessage = email.trim() !== originalAuthEmail && originalAuthEmail
        ? `Informações salvas com sucesso! Seu email de login foi atualizado para ${email.trim()}. Use este novo email para fazer login na próxima vez.`
        : "Informações da empresa salvas com sucesso!";

      toast({
        title: "Sucesso",
        description: successMessage,
        duration: 5000,
      });

      onClose();

      // Se o email foi alterado, mostrar aviso adicional
      if (email.trim() !== originalAuthEmail && originalAuthEmail) {
        setTimeout(() => {
          toast({
            title: "Email de Login Atualizado",
            description: `Seu novo email de login é: ${email.trim()}`,
            duration: 8000,
          });
        }, 1000);
      }

    } catch (error) {
      console.error("❌ CompanyInfoModal - Erro inesperado:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Informações da Empresa
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome/Razão Social *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Digite o nome ou razão social da empresa"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CPF/CNPJ *</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(XX) XXXXX-XXXX"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={isLoading}
            />
            {email.trim() !== originalAuthEmail && originalAuthEmail && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                ⚠️ Este email será usado como seu novo email de login, substituindo: {originalAuthEmail}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="XXXXX-XXX"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, Avenida, número"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro *</Label>
            <Input
              id="neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Nome do bairro"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Nome da cidade"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado *</Label>
            <Select
              value={state}
              onValueChange={setState}
              disabled={isLoading}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Selecione um estado" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
