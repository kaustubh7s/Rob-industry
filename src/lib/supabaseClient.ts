import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'RSB_SUPABASE_CONFIG_V1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync?: boolean;
}

// Check if environment variables exist with fallback to project Supabase endpoint
const DEFAULT_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://nwmxpitlnfgjbrbydjhn.supabase.co';
const DEFAULT_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_G4iqz6xwKBK3sbN3T3pgQg_SpdTMBC7';

export const getSupabaseConfig = (): SupabaseConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse Supabase config from storage:', e);
  }

  return {
    url: DEFAULT_URL,
    anonKey: DEFAULT_KEY,
    autoSync: true,
  };
};

export const saveSupabaseConfig = (config: SupabaseConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  cachedClient = null; // Reset cached client on config update
};

export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  cachedClient = null;
};

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
};

export const testSupabaseConnection = async (
  url?: string,
  anonKey?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  const targetUrl = url || getSupabaseConfig().url;
  const targetKey = anonKey || getSupabaseConfig().anonKey;

  if (!targetUrl || !targetKey) {
    return { success: false, message: 'Supabase URL and API Key are required' };
  }

  const startTime = Date.now();
  try {
    const client = createClient(targetUrl, targetKey);
    // Simple query or health check ping
    const { error } = await client.from('projects').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error) {
      // If table doesn't exist yet (PGRST116 / 42P01), connection itself is still authenticated and valid!
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          message: `Connected successfully (${latencyMs}ms)! Note: Tables need to be initialized with the SQL schema.`,
          latencyMs,
        };
      }
      return { success: false, message: `Supabase Error (${error.code || 'API'}): ${error.message}` };
    }

    return {
      success: true,
      message: `Connected to Supabase successfully (${latencyMs}ms)!`,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase endpoint',
    };
  }
};
