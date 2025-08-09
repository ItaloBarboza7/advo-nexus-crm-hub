
// Type guard utilities for safe type conversions from Supabase RPC responses

import { Json } from '@/integrations/supabase/types';
import { Lead } from '@/types/lead';

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

// Safe converter for Lead arrays (updated to return full Lead objects)
export function toLeadRecordArray(data: Json): Lead[] {
  if (!isArray(data)) {
    console.warn('Expected array but got:', typeof data);
    return [];
  }

  return data
    .filter((item): item is Record<string, Json> => isObject(item))
    .map((item): Lead => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      email: item.email ? String(item.email) : null,
      phone: String(item.phone || ''),
      description: item.description ? String(item.description) : null,
      source: item.source ? String(item.source) : null,
      status: String(item.status || 'Novo'),
      state: item.state ? String(item.state) : null,
      action_group: item.action_group ? String(item.action_group) : null,
      action_type: item.action_type ? String(item.action_type) : null,
      loss_reason: item.loss_reason ? String(item.loss_reason) : null,
      value: item.value ? Number(item.value) : null,
      user_id: String(item.user_id || ''),
      closed_by_user_id: item.closed_by_user_id ? String(item.closed_by_user_id) : null,
      created_at: String(item.created_at || ''),
      updated_at: String(item.updated_at || '')
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
