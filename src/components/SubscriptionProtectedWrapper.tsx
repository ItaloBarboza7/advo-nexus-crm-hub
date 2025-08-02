
import { ReactNode } from "react";
import { useSubscriptionControl } from "@/hooks/useSubscriptionControl";
import { BlockedContent } from "./BlockedContent";

interface SubscriptionProtectedWrapperProps {
  children: ReactNode;
  feature?: string;
  fallback?: ReactNode;
  title?: string;
  description?: string;
}

export function SubscriptionProtectedWrapper({
  children,
  feature,
  fallback,
  title,
  description
}: SubscriptionProtectedWrapperProps) {
  const { canAccessFeature } = useSubscriptionControl();

  // If no specific feature is provided, check if user is generally blocked
  const hasAccess = feature ? canAccessFeature(feature) : canAccessFeature('general_access');

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <BlockedContent 
        title={title}
        description={description}
        feature={feature}
      />
    );
  }

  return <>{children}</>;
}
