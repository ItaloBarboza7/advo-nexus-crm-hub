
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LossReasonsSection } from "@/components/settings/LossReasonsSection";
import { LeadSourcesSection } from "@/components/settings/LeadSourcesSection";
import { ActionGroupsSection } from "@/components/settings/ActionGroupsSection";
import { ActionTypesSection } from "@/components/settings/ActionTypesSection";
import { KanbanColumnsSection } from "@/components/settings/KanbanColumnsSection";
import { CompanyInfoModal } from "@/components/CompanyInfoModal";
import { EditCompanyModal } from "@/components/EditCompanyModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, User, Settings2, Database, Eye, Pencil } from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

export function SettingsContent() {
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const { companyInfo, isLoading: companyLoading, fetchCompanyInfo, updateCompanyInfo } = useCompanyInfo();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings2 className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="lead-data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Dados de Leads
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCompanyInfo(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowEditCompany(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : companyInfo ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{companyInfo.company_name}</h3>
                    <p className="text-gray-600">Empresa</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">CNPJ:</span> {companyInfo.cnpj}
                    </div>
                    <div>
                      <span className="font-medium">Telefone:</span> {companyInfo.phone}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {companyInfo.email}
                    </div>
                    <div>
                      <span className="font-medium">Endereço:</span> {companyInfo.address}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Nenhuma informação da empresa cadastrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <Button 
                  onClick={() => setShowUserProfile(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Gerenciar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-data" className="space-y-6">
          <div className="grid gap-6">
            <LossReasonsSection />
            <LeadSourcesSection />
            <ActionGroupsSection />
            <ActionTypesSection />
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <KanbanColumnsSection />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CompanyInfoModal 
        isOpen={showCompanyInfo}
        onClose={() => setShowCompanyInfo(false)}
      />

      <EditCompanyModal 
        isOpen={showEditCompany}
        onClose={() => setShowEditCompany(false)}
        companyInfo={companyInfo}
        onSave={updateCompanyInfo}
        isLoading={companyLoading}
      />

      <UserProfileModal 
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
    </div>
  );
}
