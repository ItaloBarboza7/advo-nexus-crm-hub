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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tenantSchema } = useTenantSchema();

  // Função para buscar leads - apenas quando necessário
  const fetchLeads = async () => {
    if (!tenantSchema || isLoading) return;
    
    try {
      setIsLoading(true);
      console.log("🔍 GlobalSearch - Buscando leads do tenant...");
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT id, name, email, phone, status, user_id FROM ${tenantSchema}.leads ORDER BY created_at DESC LIMIT 100`
      });

      if (error) {
        console.error('❌ Erro ao buscar leads:', error);
        return;
      }

      const leadsData = Array.isArray(data) ? data : [];
      setLeads(leadsData);
      console.log(`✅ GlobalSearch - ${leadsData.length} leads carregados do tenant`);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar leads apenas quando o modal é aberto e temos o schema
  useEffect(() => {
    if (isOpen && tenantSchema && !leads.length) {
      fetchLeads();
    }
  }, [isOpen, tenantSchema]);

  // Filtrar leads baseado no termo de busca
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads.slice(0, 10);
    
    return leads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm)
    ).slice(0, 10);
  }, [leads, searchTerm]);

  const handleLeadClick = (lead: any) => {
    setIsOpen(false);
    setSearchTerm("");
    
    // Convert the lead data to match the Lead type from types/lead.ts
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Search className="h-4 w-4" />
        Buscar leads...
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 p-0"
            autoFocus
          />
          <button
            onClick={() => {
              setIsOpen(false);
              setSearchTerm("");
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Carregando...
            </div>
          ) : filteredLeads.length > 0 ? (
            <div className="p-2">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-1 p-3 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => handleLeadClick(lead)}
                >
                  <div className="font-medium text-sm">{lead.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{lead.phone}</span>
                    {lead.email && <span>• {lead.email}</span>}
                    <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? "Nenhum lead encontrado" : "Digite para buscar"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
