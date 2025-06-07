
import { useState, useEffect } from "react";

interface CompletedRecommendation {
  id: string;
  completedAt: string;
}

export const useCompletedRecommendations = () => {
  const [completedRecommendations, setCompletedRecommendations] = useState<CompletedRecommendation[]>([]);

  // Carregar recomendações concluídas do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('completedRecommendations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCompletedRecommendations(parsed);
      } catch (error) {
        console.error('Erro ao carregar recomendações concluídas:', error);
      }
    }
  }, []);

  // Salvar no localStorage sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem('completedRecommendations', JSON.stringify(completedRecommendations));
  }, [completedRecommendations]);

  const completeRecommendation = (recommendationId: string) => {
    const newCompleted = {
      id: recommendationId,
      completedAt: new Date().toISOString()
    };
    setCompletedRecommendations(prev => [...prev, newCompleted]);
  };

  const isRecommendationCompleted = (recommendationId: string): boolean => {
    const completed = completedRecommendations.find(rec => rec.id === recommendationId);
    if (!completed) return false;

    // Verificar se já passaram 8 dias desde a conclusão
    const completedDate = new Date(completed.completedAt);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Se passaram 8 dias, remover da lista de concluídas e permitir reaparecer
    if (daysDiff >= 8) {
      setCompletedRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
      return false;
    }

    return true;
  };

  return {
    completeRecommendation,
    isRecommendationCompleted
  };
};
