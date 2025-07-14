import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { Lead } from "@/types/lead";

interface GlobalSearchProps {
  onLeadSelect?: (lead: Lead) => void;
}

export function GlobalSearch({ onLeadSelect }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { tenantSchema } = useTenantSchema();

  // Função para buscar leads quando o usuário digita
  const fetchLeads = async (term: string) => {
    if (!tenantSchema || !term.trim()) {
      setLeads([]);
      setShowResults(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("🔍 GlobalSearch - Buscando leads...");
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT id, name, email, phone, status, user_id FROM ${tenantSchema}.leads ORDER BY created_at DESC LIMIT 100`
      });

      if (error) {
        console.error('❌ Erro ao buscar leads:', error);
        return;
      }

      const leadsData = Array.isArray(data) ? data : [];
      setLeads(leadsData);
      setShowResults(true);
      console.log(`✅ GlobalSearch - ${leadsData.length} leads carregados`);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce para buscar leads enquanto digita
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchLeads(searchTerm);
      } else {
        setLeads([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, tenantSchema]);

  // Filtrar leads baseado no termo de busca
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    return leads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm)
    ).slice(0, 10);
  }, [leads, searchTerm]);

  const handleLeadClick = (lead: any) => {
    setSearchTerm("");
    setShowResults(false);
    
    // Convert the lead data to match the Lead type
    const fullLead: Lead = {
      id: lead.id,
      name: lead.name,
      email: lead.email || null,
      phone: lead.phone,
      company: '',
      source: null,
      status: lead.status,
      interest: '',
      value: null,
      lastContact: '',
      avatar: '',
      description: null,
      state: null,
      action_group: null,
      action_type: null,
      loss_reason: null,
      closed_by_user_id: null,
      user_id: lead.user_id || '',
      created_at: '',
      updated_at: ''
    };

    if (onLeadSelect) {
      onLeadSelect(fullLead);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={handleInputChange}
          className="pl-10 pr-8 bg-background border-border text-foreground placeholder:text-muted-foreground"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-lg shadow-xl border border-border max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredLeads.length > 0 ? (
            <div className="p-2">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-1 p-3 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer transition-colors"
                  onClick={() => handleLeadClick(lead)}
                >
                  <div className="font-medium text-sm text-popover-foreground">{lead.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{lead.phone}</span>
                    {lead.email && <span>• {lead.email}</span>}
                    <span className="ml-auto px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              Nenhum lead encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
