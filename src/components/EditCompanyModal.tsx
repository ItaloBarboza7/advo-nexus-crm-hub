import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilterOptions } from "@/hooks/useFilterOptions";

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
  const { stateOptions } = useFilterOptions();

  useEffect(() => {
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
  }, [companyInfo]);

  const handleSave = async () => {
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
      // Dispatch event to update header profile
      console.log('[EditCompanyModal] Disparando evento userProfileUpdated');
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));
      onClose();
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
            <p className="text-xs text-muted-foreground">
              * O e-mail pode ser alterado.
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
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
