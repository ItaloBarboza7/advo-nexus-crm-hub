
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, TrendingUp, Target, Star, Crown } from "lucide-react";
import { useTeamResults } from "@/hooks/useTeamResults";

export function TeamResultsPanel() {
  const { teamMembers, teamStats, isLoading, refreshData } = useTeamResults();

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

  if (!teamStats || teamMembers.length === 0) {
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
            Resultado do Time
          </CardTitle>
          <Button onClick={refreshData} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Estatísticas Gerais da Equipe */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{teamStats.teamSize}</div>
            <div className="text-xs text-gray-600">Membros</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{teamStats.totalSales}</div>
            <div className="text-xs text-gray-600">Vendas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{teamStats.totalProposals}</div>
            <div className="text-xs text-gray-600">Propostas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{teamStats.avgScore}</div>
            <div className="text-xs text-gray-600">Score Médio</div>
          </div>
        </div>

        {/* Destaques da Equipe */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-2 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-3 w-3 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-800">Top Performer</span>
            </div>
            <div className="text-sm font-bold text-yellow-900">{teamStats.topPerformer.name}</div>
            <div className="text-xs text-yellow-700">Score: {teamStats.topPerformer.score}</div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-800">Melhor Conversão</span>
            </div>
            <div className="text-sm font-bold text-green-900">{teamStats.bestConverter.name}</div>
            <div className="text-xs text-green-700">{teamStats.bestConverter.conversion_rate}%</div>
          </div>
        </div>

        {/* Lista de Membros da Equipe */}
        <div className="space-y-2">
          {teamMembers.slice(0, 3).map((member, index) => (
            <div 
              key={member.id} 
              className={`relative border-l-4 ${
                index === 0 ? 'border-yellow-500 bg-yellow-50' : 
                member.isAdmin ? 'border-blue-500 bg-blue-50' : 
                'border-gray-300 bg-gray-50'
              } pl-3 py-2 rounded-r-lg transition-all hover:shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                      {member.isAdmin && (
                        <Crown className="h-3 w-3 text-blue-600" />
                      )}
                      {index === 0 && (
                        <Star className="h-3 w-3 text-yellow-600" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"}
                    className={`text-xs ${index === 0 ? "bg-yellow-600" : ""}`}
                  >
                    #{index + 1}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <span className="block font-medium text-blue-600">{member.leads}</span>
                  <p className="text-xs text-gray-600">Leads</p>
                </div>
                <div className="text-center">
                  <span className="block font-medium text-orange-600">{member.proposals}</span>
                  <p className="text-xs text-gray-600">Propostas</p>
                </div>
                <div className="text-center">
                  <span className="block font-medium text-green-600">{member.sales}</span>
                  <p className="text-xs text-gray-600">Vendas</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="block font-medium text-purple-600">{member.conversion_rate}%</span>
                    <TrendingUp 
                      className={`h-2 w-2 ${
                        member.conversion_rate >= teamStats.avgConversion ? 
                        'text-green-500' : 'text-red-500'
                      }`} 
                    />
                  </div>
                  <p className="text-xs text-gray-600">Conversão</p>
                </div>
              </div>
            </div>
          ))}
          
          {teamMembers.length > 3 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500">
                +{teamMembers.length - 3} outros membros
              </span>
            </div>
          )}
        </div>

        {/* Rodapé com estatísticas */}
        <div className="mt-4 pt-3 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            <strong>{teamStats.totalLeads} leads</strong> • 
            <strong> {teamStats.totalProposals} propostas</strong> • 
            <strong> {teamStats.totalSales} vendas</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
