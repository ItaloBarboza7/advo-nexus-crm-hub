
import { useState, useCallback } from "react";

export function useNewLeadFormNewOptions() {
  const [showNewOptionInput, setShowNewOptionInput] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");

  const handleAddNewOption = useCallback((
    field: string, 
    onSuccess: (value: string) => void, 
    refreshData: () => void,
    addLossReason?: (reason: string) => Promise<boolean>,
    actionGroups?: any[],
    getActionTypeOptions?: (group: string) => any[]
  ) => {
    // This is a placeholder implementation
    // In a real scenario, this would add the new option to the database
    console.log(`Adding new option for field ${field}:`, newOptionValue);
    
    if (newOptionValue.trim()) {
      onSuccess(newOptionValue.trim());
      setNewOptionValue("");
      setShowNewOptionInput("");
      refreshData();
    }
  }, [newOptionValue]);

  // Compatibility properties for the old interface
  const isAddingNewSource = showNewOptionInput === "source";
  const isAddingNewActionGroup = showNewOptionInput === "action_group";
  const isAddingNewActionType = showNewOptionInput === "action_type";
  
  const newSourceName = isAddingNewSource ? newOptionValue : "";
  const newActionGroupName = isAddingNewActionGroup ? newOptionValue : "";
  const newActionTypeName = isAddingNewActionType ? newOptionValue : "";

  const handleNewSourceSubmit = useCallback(() => {
    if (newSourceName.trim()) {
      // This would normally add to database
      setNewOptionValue("");
      setShowNewOptionInput("");
    }
  }, [newSourceName]);

  const handleNewActionGroupSubmit = useCallback(() => {
    if (newActionGroupName.trim()) {
      // This would normally add to database
      setNewOptionValue("");
      setShowNewOptionInput("");
    }
  }, [newActionGroupName]);

  const handleNewActionTypeSubmit = useCallback(() => {
    if (newActionTypeName.trim()) {
      // This would normally add to database
      setNewOptionValue("");
      setShowNewOptionInput("");
    }
  }, [newActionTypeName]);

  const setIsAddingNewSource = useCallback((adding: boolean) => {
    setShowNewOptionInput(adding ? "source" : "");
    if (!adding) setNewOptionValue("");
  }, []);

  const setIsAddingNewActionGroup = useCallback((adding: boolean) => {
    setShowNewOptionInput(adding ? "action_group" : "");
    if (!adding) setNewOptionValue("");
  }, []);

  const setIsAddingNewActionType = useCallback((adding: boolean) => {
    setShowNewOptionInput(adding ? "action_type" : "");
    if (!adding) setNewOptionValue("");
  }, []);

  const setNewSourceName = useCallback((value: string) => {
    if (isAddingNewSource) setNewOptionValue(value);
  }, [isAddingNewSource]);

  const setNewActionGroupName = useCallback((value: string) => {
    if (isAddingNewActionGroup) setNewOptionValue(value);
  }, [isAddingNewActionGroup]);

  const setNewActionTypeName = useCallback((value: string) => {
    if (isAddingNewActionType) setNewOptionValue(value);
  }, [isAddingNewActionType]);

  return {
    showNewOptionInput,
    setShowNewOptionInput,
    newOptionValue,
    setNewOptionValue,
    handleAddNewOption,
    // Compatibility properties
    isAddingNewSource,
    isAddingNewActionGroup,
    isAddingNewActionType,
    newSourceName,
    newActionGroupName,
    newActionTypeName,
    handleNewSourceSubmit,
    handleNewActionGroupSubmit,
    handleNewActionTypeSubmit,
    setIsAddingNewSource,
    setIsAddingNewActionGroup,
    setIsAddingNewActionType,
    setNewSourceName,
    setNewActionGroupName,
    setNewActionTypeName
  };
}
