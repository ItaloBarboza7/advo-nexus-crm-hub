
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (companyInfo) {
      setCompanyName(companyInfo.company_name);
      setCnpj(companyInfo.cnpj);
      setPhone(companyInfo.phone);
      setEmail(companyInfo.email);
      setAddress(companyInfo.address);
    } else {
      // Limpar campos se não houver informações
      setCompanyName("");
      setCnpj("");
      setPhone("");
      setEmail("");
      setAddress("");
    }
  }, [companyInfo]);

  const handleSave = async () => {
    const success = await onSave({
      company_name: companyName,
      cnpj,
      phone,
      email,
      address
    });

    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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
              placeholder="Digite o nome da empresa"
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
              placeholder="empresa@exemplo.com"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade, estado"
              disabled={isLoading}
            />
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
