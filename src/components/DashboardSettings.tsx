
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

export function DashboardSettings() {
  const {
    components,
    actualComponents,
    toggleComponentVisibility,
    saveDashboardSettings,
    resetTempSettings
  } = useDashboardSettings();

  const hasChanges = JSON.stringify(components) !== JSON.stringify(actualComponents);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Componentes do Dashboard</CardTitle>
          <CardDescription>
            Configure quais componentes devem ser exibidos no dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {components.map((component) => (
            <div key={component.id} className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor={component.id} className="text-sm font-medium">
                  {component.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {component.description}
                </p>
              </div>
              <Switch
                id={component.id}
                checked={component.visible}
                onCheckedChange={() => toggleComponentVisibility(component.id)}
              />
            </div>
          ))}
          
          {hasChanges && (
            <div className="flex gap-2 pt-4">
              <Button onClick={saveDashboardSettings}>
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={resetTempSettings}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
