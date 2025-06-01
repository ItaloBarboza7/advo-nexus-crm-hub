
import { Card } from "@/components/ui/card";
import { Users, Briefcase, Calendar, DollarSign, TrendingUp, Clock } from "lucide-react";

export function DashboardContent() {
  const stats = [
    {
      title: "Total de Clientes",
      value: "247",
      icon: Users,
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "Casos Ativos",
      value: "89",
      icon: Briefcase,
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      title: "Compromissos Hoje",
      value: "12",
      icon: Calendar,
      change: "-2%",
      changeType: "negative" as const,
    },
    {
      title: "Receita Mensal",
      value: "R$ 185.400",
      icon: DollarSign,
      change: "+15%",
      changeType: "positive" as const,
    },
  ];

  const recentCases = [
    {
      id: 1,
      title: "Processo Trabalhista - Silva & Cia",
      client: "Maria Silva",
      status: "Em Andamento",
      priority: "Alta",
      date: "2024-05-28",
    },
    {
      id: 2,
      title: "Divórcio Consensual",
      client: "João Santos",
      status: "Aguardando Documentos",
      priority: "Média",
      date: "2024-05-27",
    },
    {
      id: 3,
      title: "Inventário - Família Oliveira",
      client: "Ana Oliveira",
      status: "Concluído",
      priority: "Baixa",
      date: "2024-05-26",
    },
  ];

  const upcomingAppointments = [
    {
      id: 1,
      title: "Reunião com cliente",
      client: "Carlos Mendes",
      time: "09:00",
      type: "Consulta",
    },
    {
      id: 2,
      title: "Audiência TRT",
      client: "Empresa ABC",
      time: "14:30",
      type: "Audiência",
    },
    {
      id: 3,
      title: "Assinatura de contrato",
      client: "Pedro Costa",
      time: "16:00",
      type: "Contrato",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral do seu escritório de advocacia</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`h-4 w-4 mr-1 ${
                    stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Casos Recentes</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {recentCases.map((case_) => (
              <div key={case_.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{case_.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">Cliente: {case_.client}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        case_.status === 'Concluído' ? 'bg-green-100 text-green-800' :
                        case_.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {case_.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        case_.priority === 'Alta' ? 'bg-red-100 text-red-800' :
                        case_.priority === 'Média' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {case_.priority}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{case_.date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Próximos Compromissos</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver agenda
            </button>
          </div>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                  <p className="text-sm text-gray-600">Cliente: {appointment.client}</p>
                  <span className="text-xs text-blue-600 font-medium">{appointment.type}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{appointment.time}</p>
                  <p className="text-xs text-gray-500">Hoje</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
