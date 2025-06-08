
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { Save } from "lucide-react";

export function DashboardSettings() {
  const { components, updateComponentVisibility } = useDashboardSettings();
  const [localSettings, setLocalSettings] = useState(components);
  const { toast } = useToast();

  // Sync local settings with the hook state
  useEffect(() => {
    setLocalSettings(components);
  }, [components]);

  const handleToggle = (componentId: string, visible: boolean) => {
    setLocalSettings(prev => 
      prev.map(comp => 
        comp.id === componentId ? { ...comp, visible } : comp
      )
    );
  };

  const handleSave = () => {
    // Apply all changes to the actual settings
    localSettings.forEach(component => {
      const currentComponent = components.find(comp => comp.id === component.id);
      if (currentComponent && currentComponent.visible !== component.visible) {
        updateComponentVisibility(component.id, component.visible);
      }
    });

    toast({
      title: "Configurações salvas",
      description: "As configurações do dashboard foram atualizadas com sucesso.",
    });
  };

  const hasChanges = localSettings.some(localComp => {
    const currentComp = components.find(comp => comp.id === localComp.id);
    return currentComp && currentComp.visible !== localComp.visible;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {localSettings.map((component) => (
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
                onCheckedChange={(checked) => handleToggle(component.id, checked)}
              />
            </div>
          ))}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
