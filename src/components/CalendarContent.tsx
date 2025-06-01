
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

export function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const appointments = [
    {
      id: 1,
      title: "Reunião com cliente",
      client: "Maria Silva",
      time: "09:00",
      duration: "1h",
      type: "Consulta",
      location: "Escritório",
      date: "2024-06-01",
    },
    {
      id: 2,
      title: "Audiência TRT",
      client: "João Oliveira",
      time: "14:30",
      duration: "2h",
      type: "Audiência",
      location: "Tribunal Regional do Trabalho",
      date: "2024-06-01",
    },
    {
      id: 3,
      title: "Assinatura de contrato",
      client: "Ana Costa",
      time: "16:00",
      duration: "30min",
      type: "Contrato",
      location: "Escritório",
      date: "2024-06-01",
    },
    {
      id: 4,
      title: "Depoimento",
      client: "Pedro Lima",
      time: "10:00",
      duration: "1h30",
      type: "Depoimento",
      location: "Fórum Central",
      date: "2024-06-02",
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Audiência':
        return 'bg-red-100 text-red-800';
      case 'Consulta':
        return 'bg-blue-100 text-blue-800';
      case 'Contrato':
        return 'bg-green-100 text-green-800';
      case 'Depoimento':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const todayAppointments = appointments.filter(app => app.date === "2024-06-01");
  const tomorrowAppointments = appointments.filter(app => app.date === "2024-06-02");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendário</h1>
          <p className="text-gray-600">Gerencie seus compromissos e audiências</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Compromisso
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Widget */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Junho 2024</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 5 + 1; // Adjusting for June 1st starting on Saturday
              const isCurrentMonth = day > 0 && day <= 30;
              const isToday = day === 1;
              const hasAppointments = day === 1 || day === 2;
              
              return (
                <div
                  key={i}
                  className={`p-2 text-sm cursor-pointer hover:bg-gray-100 rounded ${
                    !isCurrentMonth ? 'text-gray-300' :
                    isToday ? 'bg-blue-600 text-white' :
                    hasAppointments ? 'bg-blue-100 text-blue-800 font-medium' :
                    'text-gray-700'
                  }`}
                >
                  {isCurrentMonth ? day : ''}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Today's Appointments */}
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoje (1 de Junho)</h3>
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                          <Badge className={getTypeColor(appointment.type)}>
                            {appointment.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Cliente: {appointment.client}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{appointment.time} ({appointment.duration})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.location}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amanhã (2 de Junho)</h3>
              <div className="space-y-3">
                {tomorrowAppointments.map((appointment) => (
                  <div key={appointment.id} className="border-l-4 border-green-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                          <Badge className={getTypeColor(appointment.type)}>
                            {appointment.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Cliente: {appointment.client}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{appointment.time} ({appointment.duration})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.location}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">12</div>
          <div className="text-sm text-gray-600">Compromissos Hoje</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">8</div>
          <div className="text-sm text-gray-600">Esta Semana</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">3</div>
          <div className="text-sm text-gray-600">Audiências</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">5</div>
          <div className="text-sm text-gray-600">Consultas</div>
        </Card>
      </div>
    </div>
  );
}
