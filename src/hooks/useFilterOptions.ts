
export const useFilterOptions = () => {
  const statusOptions = [
    { value: "Novo", label: "Novo" },
    { value: "Reunião", label: "Reunião" },
    { value: "Proposta", label: "Proposta" },
    { value: "Contrato Fechado", label: "Contrato Fechado" },
    { value: "Perdido", label: "Perdido" }
  ];

  const sourceOptions = [
    { value: "website", label: "Website" },
    { value: "indicacao", label: "Indicação" },
    { value: "google", label: "Google Ads" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "outros", label: "Outros" }
  ];

  const actionGroupOptions = [
    { value: "consultoria", label: "Consultoria Jurídica" },
    { value: "contratos", label: "Contratos" },
    { value: "trabalhista", label: "Trabalhista" },
    { value: "compliance", label: "Compliance" },
    { value: "tributario", label: "Tributário" },
    { value: "civil", label: "Civil" },
    { value: "criminal", label: "Criminal" },
    { value: "outros", label: "Outros" }
  ];

  const getActionTypeOptions = (actionGroup: string) => {
    const actionTypesByGroup: Record<string, Array<{ value: string; label: string }>> = {
      tributario: [
        { value: "divida-ativa", label: "Dívida Ativa" },
        { value: "recuperacao-credito", label: "Recuperação de Crédito" },
        { value: "planejamento-tributario", label: "Planejamento Tributário" },
        { value: "restituicao-tributos", label: "Restituição de Tributos" },
        { value: "defesa-autuacao", label: "Defesa de Autuação" }
      ],
      trabalhista: [
        { value: "rescisao-contrato", label: "Rescisão de Contrato" },
        { value: "acordo-trabalhista", label: "Acordo Trabalhista" },
        { value: "acao-trabalhista", label: "Ação Trabalhista" },
        { value: "consultoria-trabalhista", label: "Consultoria Trabalhista" }
      ],
      civil: [
        { value: "contratos-civis", label: "Contratos Civis" },
        { value: "cobranca-judicial", label: "Cobrança Judicial" },
        { value: "indenizacao", label: "Indenização" },
        { value: "revisao-contrato", label: "Revisão de Contrato" }
      ],
      criminal: [
        { value: "defesa-criminal", label: "Defesa Criminal" },
        { value: "habeas-corpus", label: "Habeas Corpus" },
        { value: "recursos-criminais", label: "Recursos Criminais" }
      ],
      compliance: [
        { value: "auditoria-compliance", label: "Auditoria de Compliance" },
        { value: "politicas-internas", label: "Políticas Internas" },
        { value: "treinamento-compliance", label: "Treinamento de Compliance" }
      ],
      contratos: [
        { value: "elaboracao-contratos", label: "Elaboração de Contratos" },
        { value: "revisao-contratos", label: "Revisão de Contratos" },
        { value: "negociacao-contratos", label: "Negociação de Contratos" }
      ],
      consultoria: [
        { value: "consultoria-geral", label: "Consultoria Geral" },
        { value: "pareceres-juridicos", label: "Pareceres Jurídicos" },
        { value: "assessoria-juridica", label: "Assessoria Jurídica" }
      ],
      outros: [
        { value: "outros-tipos", label: "Outros Tipos" }
      ]
    };

    return actionTypesByGroup[actionGroup] || [];
  };

  const stateOptions = [
    { value: "Acre", label: "Acre" },
    { value: "Alagoas", label: "Alagoas" },
    { value: "Amapá", label: "Amapá" },
    { value: "Amazonas", label: "Amazonas" },
    { value: "Bahia", label: "Bahia" },
    { value: "Ceará", label: "Ceará" },
    { value: "Distrito Federal", label: "Distrito Federal" },
    { value: "Espírito Santo", label: "Espírito Santo" },
    { value: "Goiás", label: "Goiás" },
    { value: "Maranhão", label: "Maranhão" },
    { value: "Mato Grosso", label: "Mato Grosso" },
    { value: "Mato Grosso do Sul", label: "Mato Grosso do Sul" },
    { value: "Minas Gerais", label: "Minas Gerais" },
    { value: "Pará", label: "Pará" },
    { value: "Paraíba", label: "Paraíba" },
    { value: "Paraná", label: "Paraná" },
    { value: "Pernambuco", label: "Pernambuco" },
    { value: "Piauí", label: "Piauí" },
    { value: "Rio de Janeiro", label: "Rio de Janeiro" },
    { value: "Rio Grande do Norte", label: "Rio Grande do Norte" },
    { value: "Rio Grande do Sul", label: "Rio Grande do Sul" },
    { value: "Rondônia", label: "Rondônia" },
    { value: "Roraima", label: "Roraima" },
    { value: "Santa Catarina", label: "Santa Catarina" },
    { value: "São Paulo", label: "São Paulo" },
    { value: "Sergipe", label: "Sergipe" },
    { value: "Tocantins", label: "Tocantins" }
  ];

  return {
    statusOptions,
    sourceOptions,
    actionGroupOptions, // Renomeado de actionTypeOptions
    getActionTypeOptions, // Nova função para tipos específicos
    stateOptions
  };
};
