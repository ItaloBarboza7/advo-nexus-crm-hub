
import { useState, useCallback, useRef } from "react";
import { Lead } from "@/types/lead";

export interface FormData {
  name: string;
  email: string;
  phone: string;
  state: string;
  source: string;
  status: string;
  action_group: string;
  action_type: string;
  value: string;
  description: string;
  loss_reason: string;
}

export function useFormDataManager() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    state: "",
    source: "",
    status: "",
    action_group: "",
    action_type: "",
    value: "",
    description: "",
    loss_reason: "",
  });

  const originalDataRef = useRef<Lead | null>(null);

  const initializeFormData = useCallback((lead: Lead) => {
    console.log("🔄 useFormDataManager - Initializing form data for lead:", lead.name);
    
    originalDataRef.current = lead;
    
    let initialLossReason = lead.loss_reason ?? "";
    if (
      !initialLossReason ||
      initialLossReason.trim().toLowerCase() === "outros" ||
      initialLossReason.trim() === ""
    ) {
      initialLossReason = "Outros";
    }

    const initialData: FormData = {
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      state: lead.state || "",
      source: lead.source || "",
      status: lead.status || "",
      action_group: lead.action_group || "",
      action_type: lead.action_type || "",
      value: lead.value?.toString() || "",
      description: lead.description || "",
      loss_reason: initialLossReason,
    };

    setFormData(initialData);
  }, []);

  const updateField = useCallback((field: string, value: string) => {
    console.log(`📝 useFormDataManager - Updating ${field} to:`, value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear action_type when action_group changes
      if (field === 'action_group') {
        newData.action_type = "";
      }
      
      return newData;
    });
  }, []);

  const resetFormData = useCallback(() => {
    console.log("🔄 useFormDataManager - Resetting form data");
    setFormData({
      name: "",
      email: "",
      phone: "",
      state: "",
      source: "",
      status: "",
      action_group: "",
      action_type: "",
      value: "",
      description: "",
      loss_reason: "",
    });
    originalDataRef.current = null;
  }, []);

  const restoreOriginalData = useCallback(() => {
    if (originalDataRef.current) {
      console.log("🔄 useFormDataManager - Restoring original data");
      initializeFormData(originalDataRef.current);
    }
  }, [initializeFormData]);

  return {
    formData,
    initializeFormData,
    updateField,
    resetFormData,
    restoreOriginalData,
    originalData: originalDataRef.current
  };
}
