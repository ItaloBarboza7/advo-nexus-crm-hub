
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (member: any) => void;
}

export function AddMemberModal({ isOpen, onClose, onMemberAdded }: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !role) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newMember = {
      id: Date.now(),
      name,
      email,
      role,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    };

    onMemberAdded(newMember);
    
    toast({
      title: "Membro adicionado",
      description: `${name} foi adicionado à equipe com sucesso.`,
    });

    // Reset form
    setName("");
    setEmail("");
    setRole("");
    onClose();
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vendedor">Vendedor</SelectItem>
                <SelectItem value="Gerente">Gerente</SelectItem>
                <SelectItem value="Coordenador">Coordenador</SelectItem>
                <SelectItem value="Analista">Analista</SelectItem>
                <SelectItem value="Assistente">Assistente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Adicionar Membro
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
