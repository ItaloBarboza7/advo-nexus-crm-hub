
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  onMemberUpdated: (member: any) => void;
}

export function EditMemberModal({ isOpen, onClose, member, onMemberUpdated }: EditMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [hasAnalysisAccess, setHasAnalysisAccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setEmail(member.email || "");
      setRole(member.role || "");
      setPassword("");
      setHasAnalysisAccess(member.hasAnalysisAccess || false);
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !role) {
      toast({
        title: "Erro",
        description: "Nome, e-mail e cargo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const updatedMember = {
      ...member,
      name,
      email,
      role,
      hasAnalysisAccess,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      // Only update password if a new one was provided
      ...(password && { password })
    };

    onMemberUpdated(updatedMember);
    
    toast({
      title: "Membro atualizado",
      description: `${name} foi atualizado com sucesso.`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome completo</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">E-mail</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite o e-mail"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">Senha</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite uma nova senha (deixe em branco para manter a atual)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Cargo</Label>
            <Select value={role} onValueChange={setRole} required>
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
                id="edit-analysis-access"
                checked={hasAnalysisAccess}
                onCheckedChange={(checked) => setHasAnalysisAccess(checked as boolean)}
              />
              <Label htmlFor="edit-analysis-access" className="text-sm font-normal">
                Acesso a análises
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
