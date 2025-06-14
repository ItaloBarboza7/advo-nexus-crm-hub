
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (member: any) => void;
}

export function AddMemberModal({ isOpen, onClose, onMemberAdded }: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [hasAnalysisAccess, setHasAnalysisAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !role || !password) {
      toast({
        title: "Erro",
        description: "Todos os campos obrigatórios devem ser preenchidos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-member', {
        body: { name, email, password, phone, role },
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        toast({
          title: "Erro ao adicionar membro",
          description: data.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const returnedProfile = data.member;

      const newMemberForUI = {
        ...returnedProfile,
        role: returnedProfile.title,
        hasAnalysisAccess, // Note: This permission is not saved in the database yet.
        avatar: returnedProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      };

      onMemberAdded(newMemberForUI);
      
      toast({
        title: "Membro adicionado",
        description: `${name} foi adicionado à equipe com sucesso.`,
      });

      // Reset form
      setName("");
      setEmail("");
      setRole("");
      setPassword("");
      setPhone("");
      setHasAnalysisAccess(false);
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: "Erro",
        description: (error as Error).message || "Não foi possível adicionar o membro. Tente novamente.",
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
          <DialogTitle>Adicionar Novo Membro</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome completo"
              required
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
              placeholder="Digite o e-mail"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Digite o telefone"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Select value={role} onValueChange={setRole} required disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Atendimento - SDR">Atendimento - SDR</SelectItem>
                <SelectItem value="Fechamento - Closer">Fechamento - Closer</SelectItem>
                <SelectItem value="Vendedor">Vendedor</SelectItem>
                <SelectItem value="Analista">Analista</SelectItem>
                <SelectItem value="Assistente">Assistente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Acesso</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="analysis-access"
                checked={hasAnalysisAccess}
                onCheckedChange={(checked) => setHasAnalysisAccess(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="analysis-access" className="text-sm font-normal">
                Acesso a análises
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Adicionando..." : "Adicionar Membro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
