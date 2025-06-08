
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CompanyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyInfoModal({ isOpen, onClose }: CompanyInfoModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!companyName || !cnpj || !phone || !email || !address) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('company_info')
        .insert([{
          company_name: companyName,
          cnpj,
          phone,
          email,
          address
        }]);

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

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Informações da Empresa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Digite o nome da empresa"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="XX.XXX.XXX/XXXX-XX"
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
