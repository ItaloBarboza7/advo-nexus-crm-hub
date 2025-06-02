
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

  const actionTypeOptions = [
    { value: "consultoria", label: "Consultoria Jurídica" },
    { value: "contratos", label: "Contratos" },
    { value: "trabalhista", label: "Trabalhista" },
    { value: "compliance", label: "Compliance" },
    { value: "tributario", label: "Tributário" },
    { value: "civil", label: "Civil" },
    { value: "criminal", label: "Criminal" },
    { value: "outros", label: "Outros" }
  ];

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
    actionTypeOptions,
    stateOptions
  };
};
