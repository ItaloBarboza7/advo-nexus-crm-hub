
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateFilterProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  onApply?: (dateRange: DateRange | undefined) => void;
}

export function DateFilter({ date, setDate, onApply }: DateFilterProps) {
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    setDate(tempDate);
    if (onApply) {
      onApply(tempDate);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate(date);
    setIsOpen(false);
  };

  const handleClear = () => {
    const clearedDate = undefined;
    setTempDate(clearedDate);
    setDate(clearedDate);
    if (onApply) {
      onApply(clearedDate);
    }
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempDate(date);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Filtrar por período:</span>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecionar período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from}
              selected={tempDate}
              onSelect={setTempDate}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="flex justify-between gap-2 p-3 pt-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-red-600 hover:text-red-700"
              >
                Limpar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
