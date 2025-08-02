
// Type guard utilities for safe type conversions from Supabase RPC responses

import { Json } from '@/integrations/supabase/types';

export interface LeadRecord {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  status?: string;
}

export interface CountResult {
  count: number;
}

export interface TriggerResult {
  trigger_name: string;
  event_manipulation: string;
  action_statement: string;
}

// Type guard to check if a value is an array
export function isArray(value: Json): value is Json[] {
  return Array.isArray(value);
}

// Type guard to check if a value is an object
export function isObject(value: Json): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Safe converter for LeadRecord arrays
export function toLeadRecordArray(data: Json): LeadRecord[] {
  if (!isArray(data)) {
    console.warn('Expected array but got:', typeof data);
    return [];
  }

  return data
    .filter((item): item is Record<string, Json> => isObject(item))
    .map((item): LeadRecord => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      phone: String(item.phone || ''),
      created_at: String(item.created_at || ''),
      status: item.status ? String(item.status) : undefined,
    }))
    .filter(lead => lead.id && lead.name && lead.phone);
}

// Safe converter for CountResult arrays
export function toCountResultArray(data: Json): CountResult[] {
  if (!isArray(data)) {
    console.warn('Expected array but got:', typeof data);
    return [];
  }

  return data
    .filter((item): item is Record<string, Json> => isObject(item))
    .map((item): CountResult => ({
      count: typeof item.count === 'number' ? item.count : 0,
    }));
}

// Safe converter for TriggerResult arrays
export function toTriggerResultArray(data: Json): TriggerResult[] {
  if (!isArray(data)) {
    console.warn('Expected array but got:', typeof data);
    return [];
  }

  return data
    .filter((item): item is Record<string, Json> => isObject(item))
    .map((item): TriggerResult => ({
      trigger_name: String(item.trigger_name || ''),
      event_manipulation: String(item.event_manipulation || ''),
      action_statement: String(item.action_statement || ''),
    }))
    .filter(trigger => trigger.trigger_name);
}

// Safe converter for simple status objects
export function toStatusResult(data: Json): { status: string } | null {
  if (!isArray(data) || data.length === 0) {
    return null;
  }

  const first = data[0];
  if (!isObject(first)) {
    return null;
  }

  return {
    status: String(first.status || '')
  };
}
