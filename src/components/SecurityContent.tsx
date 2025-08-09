
import React from 'react';
import { SecurityDashboard } from '@/components/SecurityDashboard';

export function SecurityContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor tenant security, validate data integrity, and manage access controls.
        </p>
      </div>
      
      <SecurityDashboard />
    </div>
  );
}
