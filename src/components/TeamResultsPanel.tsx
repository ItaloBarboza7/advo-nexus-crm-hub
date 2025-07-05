
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Crown, Medal, Award } from "lucide-react";
import { useTeamResults } from "@/hooks/useTeamResults";

const getPositionData = (index: number) => {
  const position = index + 1;
  if (position === 1) {
    return {
      badge: (
        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
          <Crown className="h-4 w-4" />
          1º Lugar
        </div>
      ),
      borderColor: 'border-l-yellow-500',
      bgColor: 'bg-gradient-to-r from-yellow-50 to-yellow-100'
    };
  } else if (position === 2) {
    return {
      badge: (
        <div className="flex items-center gap-1 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
          <Medal className="h-4 w-4" />
          2º Lugar
        </div>
      ),
      borderColor: 'border-l-gray-400',
      bgColor: 'bg-gradient-to-r from-gray-50 to-gray-100'
    };
  } else if (position === 3) {
    return {
      badge: (
        <div className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-orange-500 text-orange-900 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
          <Award className="h-4 w-4" />
          3º Lugar
        </div>
      ),
      borderColor: 'border-l-orange-500',
      bgColor: 'bg-gradient-to-r from-orange-50 to-orange-100'
    };
  } else if (position <= 5) {
    return {
      badge: (
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          {position}º
        </div>
      ),
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100'
    };
  }
  return {
    badge: (
      <div className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
        {position}º
      </div>
    ),
    borderColor: 'border-l-green-500',
    bgColor: 'bg-gradient-to-r from-green-50 to-green-100'
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
