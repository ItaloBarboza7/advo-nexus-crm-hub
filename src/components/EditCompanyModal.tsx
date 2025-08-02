
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailAvailability } from "@/hooks/useEmailAvailability";

interface CompanyInfo {
  id: string;
  company_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
}

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo | null;
  onSave: (info: Omit<CompanyInfo, 'id'>) => Promise<boolean>;
  isLoading: boolean;
}

// Faz o parsing reverso do campo address
function parseCompanyAddressFields(addr: string) {
  const result = {
    cep: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
  };
  try {
    const parts = addr.split(",");
    // O último campo normalmente é "CEP: XXXXX-XXX"
    if (parts.length > 0) {
      const cepMatch = parts[parts.length - 1].match(/CEP[:\s]+([0-9\-]+)/i);
      if (cepMatch) {
        result.cep = cepMatch[1].trim();
        parts.pop();
      }
    }
    if (parts[0]) result.address = parts[0].trim();
    if (parts[1]) result.neighborhood = parts[1].trim();
    if (parts[2]) result.city = parts[2].trim();
    if (parts[3]) result.state = parts[3].trim();
  } catch {
    // Mantém campos vazios se falhar
  }
  return result;
}

export function EditCompanyModal({ 
  isOpen, 
  onClose, 
  companyInfo, 
  onSave, 
  isLoading 
}: EditCompanyModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [emailError, setEmailError] = useState<string>('');
  const [previousEmail, setPreviousEmail] = useState<string>('');
  const { stateOptions } = useFilterOptions();
  const { toast } = useToast();
  const { checkEmailAvailability, isChecking } = useEmailAvailability();

  useEffect(() => {
    const loadUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setOriginalEmail(user.email);
      }
    };

    if (isOpen) {
      loadUserEmail();
    }

    if (companyInfo) {
      setCompanyName(companyInfo.company_name);
      setCnpj(companyInfo.cnpj);
      setPhone(companyInfo.phone);
      setEmail(companyInfo.email);

      // Parse address em campos separados (se companyInfo.address existir)
      if (companyInfo.address) {
        const parsed = parseCompanyAddressFields(companyInfo.address);
        setCep(parsed.cep ?? "");
        setAddress(parsed.address ?? "");
        setNeighborhood(parsed.neighborhood ?? "");
        setCity(parsed.city ?? "");
        setState(parsed.state ?? "");
      } else {
        setCep("");
        setAddress("");
        setNeighborhood("");
        setCity("");
        setState("");
      }
    } else {
      // Limpar todos
      setCompanyName("");
      setCnpj("");
      setPhone("");
      setEmail("");
      setCep("");
      setAddress("");
      setNeighborhood("");
      setCity("");
      setState("");
    }
  }, [companyInfo, isOpen]);

  // Verificar disponibilidade do email quando o usuário para de digitar
  useEffect(() => {
    const checkEmail = async () => {
      // Só verificar se o email mudou do original e não está vazio
      if (email && email.includes('@') && email !== originalEmail && email !== previousEmail) {
        const result = await checkEmailAvailability(email);
        
        if (!result.available) {
          setEmailError('Email indisponível');
        } else {
          setEmailError('');
        }
        setPreviousEmail(email);
      } else if (!email || !email.includes('@') || email === originalEmail) {
        setEmailError('');
        setPreviousEmail('');
      }
    };

    // Debounce para evitar muitas chamadas
    const timeoutId = setTimeout(checkEmail, 1000);
    return () => clearTimeout(timeoutId);
  }, [email, originalEmail, checkEmailAvailability, previousEmail]);

  // Real-time subscription para mudanças no perfil do usuário
  useEffect(() => {
    if (!isOpen) return;

    const setupRealtimeSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('[EditCompanyModal] Configurando sincronização em tempo real');
      
      const channel = supabase
        .channel('company_user_profile_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[EditCompanyModal] Mudança no perfil detectada:', payload);
            if (payload.new && typeof payload.new === 'object') {
              const newData = payload.new as any;
              console.log('[EditCompanyModal] Atualizando campos com dados do perfil:', newData);
              setEmail(newData.email || "");
              setPhone(newData.phone || "");
            }
          }
        )
        .subscribe();

      return () => {
        console.log('[EditCompanyModal] Removendo subscription');
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

  const handleSave = async () => {
    console.log('[EditCompanyModal] Iniciando salvamento das informações da empresa');
    
    if (emailError) {
      toast({
        title: "Email indisponível",
        description: "Este email já está sendo usado. Escolha outro email.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Se o email foi alterado, usar a Edge Function para atualizar o email de autenticação
      if (email.trim() !== originalEmail) {
        console.log('[EditCompanyModal] Email alterado, atualizando via Edge Function');
        const { data, error } = await supabase.functions.invoke('update-user-email', {
          body: { 
            newEmail: email.trim()
          },
        });

        if (error) {
          console.error('[EditCompanyModal] Erro da Edge Function:', error);
          toast({
            title: "Erro ao atualizar email",
            description: "Não foi possível atualizar o email. Tente novamente.",
            variant: "destructive",
          });
          return;
        }
        
        if (data?.error) {
          console.error('[EditCompanyModal] Erro retornado pela função:', data);
          
          // Verificar se é um erro de email já existente
          if (data.code === 'EMAIL_ALREADY_EXISTS') {
            setEmailError('Email indisponível');
            toast({
              title: "Email já existe",
              description: "Este email já está sendo usado por outra conta. Por favor, escolha outro email.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao atualizar email",
              description: data.error || "Erro desconhecido ao atualizar email",
              variant: "destructive",
            });
          }
          return;
        }

        console.log('[EditCompanyModal] Email de autenticação atualizado com sucesso');
      }

      // Montar o address no mesmo formato do modal inicial
      const fullAddress = `${address}, ${neighborhood}, ${city}, ${state}, CEP: ${cep}`;

      const success = await onSave({
        company_name: companyName,
        cnpj,
        phone,
        email,
        address: fullAddress
      });

      if (success) {
        console.log('[EditCompanyModal] Salvamento bem-sucedido');
        toast({
          title: "Informações atualizadas",
          description: email.trim() !== originalEmail ? 
            "Informações salvas com sucesso. Se você alterou o email, faça login novamente com o novo email." :
            "Informações da empresa atualizadas com sucesso.",
        });
        onClose();
      } else {
        console.error('[EditCompanyModal] Falha no salvamento');
      }
    } catch (error) {
      console.error('[EditCompanyModal] Erro inesperado:', error);
      toast({
        title: "Erro",
        description: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {companyInfo ? "Editar Informações da Empresa" : "Cadastrar Informações da Empresa"}
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
            <p className="text-xs text-muted-foreground">
              * Alterações aqui também afetarão o perfil do usuário
            </p>
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
              className={emailError ? "border-red-500" : ""}
            />
            {isChecking && email && (
              <p className="text-sm text-gray-500">Verificando disponibilidade...</p>
            )}
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              * Alterações no email também afetarão o login do sistema
            </p>
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
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !!emailError || isChecking}
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
