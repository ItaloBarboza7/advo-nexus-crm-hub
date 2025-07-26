
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { SecureTenantDashboard } from "@/components/SecureTenantDashboard";

export function Dashboard() {
  const { hasPermission } = useUserPermissions();
  
  // Check if user has dashboard permission using the generic hasPermission function
  const canViewDashboard = hasPermission('dashboard', 'view');

  if (!canViewDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar o dashboard. Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  return <SecureTenantDashboard />;
}
