
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { useTeamResults } from "@/hooks/useTeamResults";

export function TeamResultsPanel() {
  const { teamMembers, isLoading, refreshData } = useTeamResults();

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-blue-600" />
            Resultado do Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Carregando...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-4 w-4 text-blue-600" />
              Resultado do Time
            </CardTitle>
            <Button onClick={refreshData} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-center py-4">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Nenhum membro encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-blue-600" />
            Resultado do Time ({teamMembers.length} membros)
          </CardTitle>
          <Button onClick={refreshData} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* ScrollArea ajustado para mostrar apenas 3 membros */}
        <ScrollArea className="h-[240px] w-full">
          <div className="space-y-4 pr-4">
            {teamMembers.map((member, index) => (
              <div 
                key={member.id} 
                className={`border-l-4 ${
                  member.isAdmin ? 'border-purple-500 bg-purple-50' : 'border-blue-500'
                } pl-4 py-2`}
              >
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {member.name}
                    {member.isAdmin && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        Admin
                      </span>
                    )}
                  </h4>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{member.leads}</div>
                    <p className="text-xs text-gray-600">Leads</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{member.proposals}</div>
                    <p className="text-xs text-gray-600">Propostas</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{member.sales}</div>
                    <p className="text-xs text-gray-600">Vendas</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{member.score}</div>
                    <p className="text-xs text-gray-600">Pontuação</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
