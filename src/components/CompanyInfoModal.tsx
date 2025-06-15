
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

interface CompanyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyInfoModal({ isOpen, onClose }: CompanyInfoModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { stateOptions } = useFilterOptions();
  const { companyInfo, isLoading: loadingCompany, refreshCompanyInfo } = useCompanyInfo();

  // Preencher campos ao abrir o modal usando os dados já salvos no banco (se houver)
  useEffect(() => {
    if (isOpen && companyInfo) {
      setCompanyName(companyInfo.company_name || "");
      setCpfCnpj(companyInfo.cnpj || "");
      setPhone(companyInfo.phone || "");
      setEmail(companyInfo.email || "");
      // Fazer parsing do address registrado, caso exista
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
    } else if (isOpen) {
      loadUserEmail();
      // Limpa os campos se não houver companyInfo
      setCompanyName(""); setCpfCnpj(""); setPhone(""); setCep(""); setAddress(""); setNeighborhood(""); setCity(""); setState("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, companyInfo]);

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
      }
    } catch (error) {
      console.error('Erro ao carregar email do usuário:', error);
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

  const handleSave = async () => {
    if (!companyName || !cpfCnpj || !phone || !email || !cep || !address || !neighborhood || !city || !state) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      // Concatenar endereço completo
      const fullAddress = `${address}, ${neighborhood}, ${city}, ${state}, CEP: ${cep}`;

      const { error } = await supabase
        .from('company_info')
        .upsert({
          user_id: user.id,
          company_name: companyName,
          cnpj: cpfCnpj,
          phone,
          email,
          address: fullAddress
        });

      if (error) {
        console.error('Erro ao salvar informações da empresa:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as informações da empresa.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Informações salvas",
        description: "As informações da empresa foram salvas com sucesso.",
      });

      // Marcar no localStorage que as informações da empresa já foram preenchidas
      localStorage.setItem('companyInfoCompleted', 'true');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar informações da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as informações da empresa.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Caso não encontre companyInfo, avisa no modal
  useEffect(() => {
    if (isOpen && !loadingCompany && !companyInfo) {
      toast({
        title: "Informações da empresa não encontradas!",
        description: "Nenhum cadastro encontrado. Preencha e salve as informações.",
        variant: "destructive",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadingCompany, companyInfo]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Informações da Empresa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between pb-2">
            <span />
            <Button onClick={refreshCompanyInfo} variant="outline" size="sm" type="button" disabled={isLoading || loadingCompany}>
              Recarregar Informações
            </Button>
          </div>

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
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              * E-mail da conta (não editável)
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

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isLoading} className="w-full">
              {isLoading ? "Salvando..." : "Salvar e continuar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
