
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Mail, Phone, MapPin, FileText, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { EditCompanyModal } from "@/components/EditCompanyModal";

interface CompanyInfo {
  id: string;
  company_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
}

export function CompanyContent() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const fetchCompanyInfo = async () => {
    try {
      setIsLoading(true);
      console.log("🏢 CompanyContent - Buscando informações da empresa...");

      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.company_info ORDER BY created_at DESC LIMIT 1`
      });

      if (error) {
        console.error('❌ Erro ao buscar informações da empresa:', error);
        return;
      }

      const companyData = Array.isArray(data) && data.length > 0 ? data[0] : null;
      console.log('🏢 CompanyContent - Dados da empresa:', companyData);
      setCompanyInfo(companyData);

    } catch (error) {
      console.error('❌ Erro inesperado ao buscar informações da empresa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSchema) {
      fetchCompanyInfo();
    }
  }, [tenantSchema]);

  const handleCompanyUpdated = () => {
    console.log("✅ CompanyContent - Empresa atualizada, recarregando dados");
    fetchCompanyInfo();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando informações da empresa...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Informações da Empresa</h1>
          <p className="text-gray-600">Gerencie as informações básicas da sua empresa</p>
        </div>
        <Button 
          onClick={() => setIsEditModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {companyInfo ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Editar Empresa
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Empresa
            </>
          )}
        </Button>
      </div>

      {companyInfo ? (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Nome da Empresa</p>
                  <p className="text-lg font-semibold text-gray-900">{companyInfo.company_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">CNPJ</p>
                  <p className="text-lg font-semibold text-gray-900">{companyInfo.cnpj}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-lg font-semibold text-gray-900">{companyInfo.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Telefone</p>
                  <p className="text-lg font-semibold text-gray-900">{companyInfo.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Endereço</p>
                  <p className="text-lg font-semibold text-gray-900">{companyInfo.address}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma empresa cadastrada</h3>
            <p className="mb-4">Cadastre as informações da sua empresa para começar.</p>
            <Button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Empresa
            </Button>
          </div>
        </Card>
      )}

      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onCompanyUpdated={handleCompanyUpdated}
        companyInfo={companyInfo}
      />
    </div>
  );
}
