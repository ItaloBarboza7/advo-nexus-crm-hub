
import { useMemo, useState } from "react";
import { addMonths, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameMonth, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Calendar, Pencil } from "lucide-react";
import { TaskDialog } from "./agenda/TaskDialog";
import { Task } from "./agenda/types";

function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem("team_tasks_v1");
    if (!raw) return [];
    const arr = JSON.parse(raw) as Task[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem("team_tasks_v1", JSON.stringify(tasks));
}

export function AgendaContent() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      const key = t.date;
      (map[key] ||= []).push(t);
    }
    // sort tasks by time (HH:mm) then title
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => {
        const ta = a.time ?? "99:99";
        const tb = b.time ?? "99:99";
        if (ta !== tb) return ta.localeCompare(tb);
        return a.title.localeCompare(b.title);
      })
    );
    return map;
  }, [tasks]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { locale: ptBR });
  const gridEnd = endOfWeek(monthEnd, { locale: ptBR });

  const weeks: Date[][] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  function onAddTask(date: Date) {
    setSelectedTaskId(null);
    setSelectedDate(dateKey(date));
    setDialogOpen(true);
  }

  function handleSaveTask(newTask: Task) {
    setTasks((prev) => {
      const updated = [...prev, newTask];
      saveTasks(updated);
      return updated;
    });
  }

  function handleDeleteTask(id: string) {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTasks(updated);
      return updated;
    });
  }

  function handleUpdateTask(updatedTask: Task) {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      saveTasks(updated);
      return updated;
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-screen-2xl py-4 space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
        </header>
        
        <section className="space-y-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg border bg-background px-1 py-1 shadow-sm">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, -12))} aria-label="Ano anterior">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} aria-label="Mês anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-3 py-1 rounded-md bg-secondary text-sm font-medium flex items-center gap-2 min-w-[160px] justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(currentMonth, "LLLL, yyyy", { locale: ptBR })}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Próximo mês">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 12))} aria-label="Próximo ano">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="brand" onClick={() => onAddTask(new Date())}>
                <Plus className="h-4 w-4 mr-2" /> Nova tarefa
              </Button>
            </div>
          </header>
          <Separator />

          <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
            {weeks[0].map((d) => (
              <div key={d.toISOString()} className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {format(d, "EEEEEE", { locale: ptBR })}
              </div>
            ))}

            {weeks.flat().map((d) => {
              const key = dateKey(d);
              const dayTasks = tasksByDay[key] || [];
              const muted = !isSameMonth(d, currentMonth);
              const today = isToday(d);

              return (
                <div key={d.toISOString()} className={(muted ? "opacity-60 " : "") + "space-y-1"}>
                  <div className="flex items-baseline justify-between pl-0.5">
                    <button
                      className="text-lg md:text-xl font-bold leading-none text-foreground hover:text-[hsl(var(--brand-1))] transition-colors"
                      onClick={() => onAddTask(d)}
                      aria-label="Adicionar tarefa"
                    >
                      {format(d, "d", { locale: ptBR })}
                    </button>
                    {today && (
                      <span className="text-xs font-medium text-[hsl(var(--brand-1))]">Hoje</span>
                    )}
                  </div>
                  <Card
                    className={
                      "group relative min-h-[120px] p-2 border border-[hsl(var(--brand-1))]/10 hover:ring-1 hover:ring-[hsl(var(--brand-1))]/15 transition-all duration-300 rounded-lg elevation-soft hover:elevation-float bg-background"
                    }
                    onDoubleClick={() => onAddTask(d)}
                  >
                    <div className="space-y-1.5">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="group/task relative w-full text-sm rounded-md border border-border bg-background hover:bg-accent px-2 py-1 transition-colors focus-within:ring-2 focus-within:ring-ring flex items-center justify-between gap-2"
                          title={t.description}
                        >
                          <div className="absolute left-0 top-0 h-full w-1 rounded-l-md" style={{ background: t.color || "hsl(var(--brand-1))", opacity: 0.7 }} aria-hidden="true" />

                          <button
                            className="flex-1 text-left min-w-0"
                            onClick={() => {
                              setSelectedDate(t.date);
                              setSelectedTaskId(t.id);
                              setDialogOpen(true);
                            }}
                            aria-label={`Editar tarefa: ${t.title}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {t.time && <span className="text-xs font-medium shrink-0" style={{ color: t.color || "hsl(var(--brand-1))" }}>{t.time}</span>}
                                <span className="truncate font-medium text-xs">{t.title}</span>
                              </div>
                              {t.owner && (
                                <span className="text-xs text-muted-foreground truncate">{t.owner}</span>
                              )}
                            </div>
                          </button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover/task:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(t.date);
                              setSelectedTaskId(t.id);
                              setDialogOpen(true);
                            }}
                            aria-label="Editar tarefa"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <button
                          onClick={() => onAddTask(d)}
                          className="w-full text-left text-xs text-muted-foreground/80 hover:text-foreground/80 transition-colors"
                        >
                          Adicionar tarefa…
                        </button>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

          <TaskDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            defaultDate={selectedDate ? parseISO(selectedDate) : new Date()}
            onSave={handleSaveTask}
            onUpdate={(task) => { handleUpdateTask(task); setSelectedTaskId(null); }}
            onDelete={handleDeleteTask}
            existingTasks={[]}
            editingTask={selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null}
            onStartEdit={(id) => {
              const task = tasks.find((x) => x.id === id);
              if (task) {
                setSelectedDate(task.date);
                setSelectedTaskId(id);
              }
            }}
          />
        </section>
      </section>
    </main>
  );
}
