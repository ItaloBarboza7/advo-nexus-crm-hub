
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Resultado do Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados da equipe...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!teamStats || teamMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Resultado do Time
            </CardTitle>
            <Button onClick={refreshData} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum membro da equipe encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Resultado do Time
          </CardTitle>
          <Button onClick={refreshData} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Estatísticas Gerais da Equipe */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{teamStats.teamSize}</div>
            <div className="text-xs text-gray-600">Membros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{teamStats.totalSales}</div>
            <div className="text-xs text-gray-600">Vendas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{teamStats.totalProposals}</div>
            <div className="text-xs text-gray-600">Propostas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{teamStats.avgScore}</div>
            <div className="text-xs text-gray-600">Score Médio</div>
          </div>
        </div>

        {/* Destaques da Equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Top Performer</span>
            </div>
            <div className="text-lg font-bold text-yellow-900">{teamStats.topPerformer.name}</div>
            <div className="text-sm text-yellow-700">Score: {teamStats.topPerformer.score}</div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Melhor Conversão</span>
            </div>
            <div className="text-lg font-bold text-green-900">{teamStats.bestConverter.name}</div>
            <div className="text-sm text-green-700">{teamStats.bestConverter.conversion_rate}%</div>
          </div>
        </div>

        {/* Lista de Membros da Equipe */}
        <div className="space-y-3">
          {teamMembers.map((member, index) => (
            <div 
              key={member.id} 
              className={`relative border-l-4 ${
                index === 0 ? 'border-yellow-500 bg-yellow-50' : 
                member.isAdmin ? 'border-blue-500 bg-blue-50' : 
                'border-gray-300 bg-gray-50'
              } pl-4 py-3 rounded-r-lg transition-all hover:shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      {member.isAdmin && (
                        <Crown className="h-4 w-4 text-blue-600" />
                      )}
                      {index === 0 && (
                        <Star className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"}
                    className={index === 0 ? "bg-yellow-600" : ""}
                  >
                    #{index + 1}
                  </Badge>
                  <Badge variant="outline">
                    Score: {member.score}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <span className="block font-medium text-blue-600 text-lg">{member.leads}</span>
                  <p className="text-xs text-gray-600">Leads</p>
                </div>
                <div className="text-center">
                  <span className="block font-medium text-orange-600 text-lg">{member.proposals}</span>
                  <p className="text-xs text-gray-600">Propostas</p>
                </div>
                <div className="text-center">
                  <span className="block font-medium text-green-600 text-lg">{member.sales}</span>
                  <p className="text-xs text-gray-600">Vendas</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="block font-medium text-purple-600 text-lg">{member.conversion_rate}%</span>
                    <TrendingUp 
                      className={`h-3 w-3 ${
                        member.conversion_rate >= teamStats.avgConversion ? 
                        'text-green-500' : 'text-red-500'
                      }`} 
                    />
                  </div>
                  <p className="text-xs text-gray-600">Conversão</p>
                </div>
              </div>

              {/* Comparação com a média da equipe */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    Score {member.score >= teamStats.avgScore ? 'acima' : 'abaixo'} da média 
                    ({teamStats.avgScore})
                  </span>
                  <span>
                    Conversão {member.conversion_rate >= teamStats.avgConversion ? 'acima' : 'abaixo'} da média 
                    ({teamStats.avgConversion}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com estatísticas */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Total da equipe: <strong>{teamStats.totalLeads} leads</strong> • 
            <strong> {teamStats.totalProposals} propostas</strong> • 
            <strong> {teamStats.totalSales} vendas</strong> • 
            Conversão média: <strong>{teamStats.avgConversion}%</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
