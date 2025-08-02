import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEmailAvailability } from "@/hooks/useEmailAvailability";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface CompanyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyInfoModal({ isOpen, onClose }: CompanyInfoModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [existingCompanyId, setExistingCompanyId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string>('');
  const [previousEmail, setPreviousEmail] = useState<string>('');
  const { toast } = useToast();
  const { stateOptions } = useFilterOptions();
  const { checkEmailAvailability, isChecking } = useEmailAvailability();

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

  // Carregar informações existentes ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadExistingCompanyInfo();
    }
  }, [isOpen]);

  const loadExistingCompanyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🏢 CompanyInfoModal - Carregando informações existentes da empresa para usuário:', user.id);

      // Verificar se já existe informação da empresa na tabela public.company_info
      const { data: existingCompany, error } = await supabase
        .from('company_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao carregar informações da empresa:', error);
        return;
      }

      if (existingCompany) {
        console.log('✅ Informações da empresa encontradas, preenchendo campos:', existingCompany);
        setExistingCompanyId(existingCompany.id);
        setCompanyName(existingCompany.company_name || "");
        setCpfCnpj(existingCompany.cnpj || "");
        setPhone(existingCompany.phone || "");
        setEmail(existingCompany.email || user.email || "");
        setOriginalEmail(existingCompany.email || user.email || "");

        // Parse do endereço se existir
        if (existingCompany.address) {
          const parsed = parseCompanyAddressFields(existingCompany.address);
          setCep(parsed.cep ?? "");
          setAddress(parsed.address ?? "");
          setNeighborhood(parsed.neighborhood ?? "");
          setCity(parsed.city ?? "");
          setState(parsed.state ?? "");
        }
      } else {
        // Se não há informações, carregar email do usuário (não editável no modal inicial)
        const userEmail = user.email || "";
        setEmail(userEmail);
        setOriginalEmail(userEmail);
        setExistingCompanyId(null);
        console.log('ℹ️ Nenhuma informação de empresa encontrada, preenchendo email da conta:', userEmail);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar informações da empresa:', error);
      // Em caso de erro, pelo menos carregar o email do usuário
      loadUserEmail();
    }
  };

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userEmail = user.email || "";
        setEmail(userEmail);
        setOriginalEmail(userEmail);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar email do usuário:', error);
    }
  };

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

  const updateUserProfile = async (email: string, phone: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      console.log('👤 Atualizando perfil do usuário com email e telefone sincronizados...');

      // Verificar se já existe um perfil para este usuário
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar perfil existente:', checkError);
        return false;
      }

      const profileData = {
        user_id: user.id,
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

      let saveError;
      if (existingProfile) {
        // Atualizar perfil existente mantendo o nome
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        saveError = error;
      } else {
        // Criar novo perfil com dados básicos
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            ...profileData,
            name: user.user_metadata?.name || user.email?.split('@')[0] || "Usuário"
          });
        saveError = error;
      }

      if (saveError) {
        console.error('Erro ao atualizar perfil do usuário:', saveError);
        return false;
      }

      console.log('✅ Perfil do usuário atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro inesperado ao atualizar perfil do usuário:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!companyName || !cpfCnpj || !phone || !email || !cep || !address || !neighborhood || !city || !state) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (emailError) {
      toast({
        title: "Email indisponível",
        description: "Este email já está sendo usado. Escolha outro email.",
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

      console.log('💾 CompanyInfoModal - Salvando informações da empresa para usuário:', user.id);

      // Concatenar endereço completo
      const fullAddress = `${address}, ${neighborhood}, ${city}, ${state}, CEP: ${cep}`;

      const companyData = {
        user_id: user.id,
        company_name: companyName,
        cnpj: cpfCnpj,
        phone,
        email,
        address: fullAddress
      };

      let error;

      if (existingCompanyId) {
        // Atualizar registro existente
        console.log('🔄 Atualizando informações da empresa existente:', existingCompanyId);
        const updateResult = await supabase
          .from('company_info')
          .update(companyData)
          .eq('id', existingCompanyId)
          .eq('user_id', user.id);
        
        error = updateResult.error;
      } else {
        // Criar novo registro
        console.log('➕ Criando novo registro de informações da empresa');
        const insertResult = await supabase
          .from('company_info')
          .insert(companyData);
        
        error = insertResult.error;
      }

      if (error) {
        console.error('❌ Erro ao salvar informações da empresa:', error);
        
        // Tratar erro específico de chave duplicada
        if (error.code === '23505' && error.message.includes('company_info_user_id_key')) {
          toast({
            title: "Informações já existem",
            description: "As informações da empresa já estão cadastradas para este usuário.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: `Não foi possível salvar as informações da empresa: ${error.message}`,
            variant: "destructive",
          });
        }
        return;
      }

      console.log('✅ Informações da empresa salvas com sucesso');

      // Sincronizar com perfil do usuário
      const profileUpdateSuccess = await updateUserProfile(email, phone);
      if (!profileUpdateSuccess) {
        toast({
          title: "Aviso",
          description: "Informações da empresa salvas, mas houve problema ao sincronizar com o perfil.",
        });
      }

      // Atualizar os metadados do usuário para marcar que as informações estão completas
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          is_first_login: false,
          company_info_completed: true
        }
      });

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar metadados do usuário:', updateError);
      }

      toast({
        title: "Informações salvas",
        description: "As informações da empresa foram salvas com sucesso.",
      });

      onClose();
    } catch (error) {
      console.error('❌ Erro inesperado ao salvar informações da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as informações da empresa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se é um modal inicial (sem informações existentes da empresa)
  const isInitialModal = !existingCompanyId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {existingCompanyId ? 'Editar Informações da Empresa' : 'Informações da Empresa'}
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
            <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
            <Input
              id="cpfCnpj"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
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
              disabled={isLoading || isInitialModal}
              className={`${isInitialModal ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} ${emailError ? "border-red-500" : ""}`}
            />
            {isInitialModal && (
              <p className="text-xs text-muted-foreground">
                Email da conta criada (não editável)
              </p>
            )}
            {!isInitialModal && isChecking && email && (
              <p className="text-sm text-gray-500">Verificando disponibilidade...</p>
            )}
            {!isInitialModal && emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
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
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Fechar
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
