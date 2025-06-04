
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

interface GlobalSearchProps {
  onLeadSelect: (lead: Lead) => void;
}

export function GlobalSearch({ onLeadSelect }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        const transformedLeads: Lead[] = data.map(lead => ({
          ...lead,
          company: undefined,
          interest: undefined,
          lastContact: undefined,
          avatar: undefined
        }));
        setLeads(transformedLeads);
      }
    };

    fetchLeads();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.phone && lead.phone.includes(searchTerm)) ||
        (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredLeads(filtered);
      setShowResults(true);
    } else {
      setFilteredLeads([]);
      setShowResults(false);
    }
  }, [searchTerm, leads]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Contrato Fechado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Novo':
      case 'Proposta':
      case 'Reunião':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Perdido':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setSearchTerm("");
    setShowResults(false);
    onLeadSelect(lead);
  };

  const handleFocus = () => {
    if (searchTerm.length > 0) {
      setShowResults(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding results to allow for click on result
    setTimeout(() => setShowResults(false), 150);
  };

  return (
    <div className="relative max-w-md w-full">
      <Input
        placeholder="Buscar leads..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
      />
      
      {showResults && filteredLeads.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto z-50 border shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="p-2">
            {filteredLeads.slice(0, 10).map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleLeadSelect(lead)}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <div className="bg-blue-600 dark:bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                  {lead.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{lead.name}</span>
                    <Badge className={getStatusColor(lead.status)} variant="outline">
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {lead.email} • {lead.phone}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {showResults && filteredLeads.length === 0 && searchTerm.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 border shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Nenhum lead encontrado.
          </div>
        </Card>
      )}
    </div>
  );
}
