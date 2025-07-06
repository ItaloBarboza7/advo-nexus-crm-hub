
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { useTeamResults } from "@/hooks/useTeamResults";

const getPositionData = (index: number) => {
  const position = index + 1;
  if (position === 1) {
    return {
      badge: (
        <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
          1º
        </div>
      ),
      borderColor: 'border-l-yellow-500',
      bgColor: 'bg-yellow-50'
    };
  } else if (position === 2) {
    return {
      badge: (
        <div className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium">
          2º
        </div>
      ),
      borderColor: 'border-l-gray-500',
      bgColor: 'bg-gray-50'
    };
  } else if (position === 3) {
    return {
      badge: (
        <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
          3º
        </div>
      ),
      borderColor: 'border-l-orange-500',
      bgColor: 'bg-orange-50'
    };
  } else if (position <= 5) {
    return {
      badge: (
        <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
          {position}º
        </div>
      ),
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-50'
    };
  }
  return {
    badge: (
      <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
        {position}º
      </div>
    ),
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-50'
  };
};

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
        {/* ScrollArea ajustado para mostrar exatamente 3 membros completos */}
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-4 pr-4">
            {teamMembers.map((member, index) => {
              const positionData = getPositionData(index);
              
              return (
                <div 
                  key={member.id} 
                  className={`border-l-4 ${positionData.borderColor} ${positionData.bgColor} rounded-r-lg p-4 shadow-sm`}
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {member.name}
                        {member.isAdmin && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            Admin
                          </span>
                        )}
                      </h4>
                      {positionData.badge}
                    </div>
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
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
