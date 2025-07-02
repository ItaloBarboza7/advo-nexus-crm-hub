import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrazilTimezone } from "@/lib/timezone";

interface IntegratedCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function IntegratedCalendar({ selectedDate, onDateSelect }: IntegratedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handleDateClick = (day: number) => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    if (day > 0 && day <= daysInMonth) {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      onDateSelect(newDate);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderCalendar = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const calendarDays = [];
    
    // Dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(
        <div key={`empty-start-${i}`} className="p-2"></div>
      );
    }
    
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const today = BrazilTimezone.now();
      const isToday = day === today.getDate() && 
                     currentDate.getMonth() === today.getMonth() && 
                     currentDate.getFullYear() === today.getFullYear();
      const isSelected = selectedDate && 
                       day === selectedDate.getDate() && 
                       currentDate.getMonth() === selectedDate.getMonth() && 
                       currentDate.getFullYear() === selectedDate.getFullYear();
      
      calendarDays.push(
        <button
          key={`day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`}
          onClick={() => handleDateClick(day)}
          className={`p-2 text-sm rounded-md transition-colors hover:bg-accent ${
            isSelected ? 'bg-primary text-primary-foreground' :
            isToday ? 'bg-accent text-accent-foreground font-medium' :
            'text-foreground hover:text-accent-foreground'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return calendarDays;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <div key={`header-${index}`} className="p-2 text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {renderCalendar()}
      </div>
    </Card>
  );
}