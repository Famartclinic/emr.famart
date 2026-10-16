/**
 * Staff accounts, backed by the `user_profiles` table and Supabase Auth.
 *
 * Creating or re-credentialing an auth user needs the service-role key, so those
 * operations go through the `staff-admin` Edge Function, which authorises the
 * caller from their own JWT. Never expose the service key to the browser.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { UserProfile, UserRole } from '../types/emr';

export interface StaffDraft {
  fullName: string;
  email: string;
  role: UserRole;
  title?: string;
  department?: string;
  phone?: string;
  licenseNumber?: string;
  username?: string;
}

export interface StaffResult {
  ok: boolean;
  error?: string;
}

type StaffRow = {
  id: string;
  email: string | null;
  full_name: string;
  username: string | null;
  role: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  license_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
};

const STAFF_COLUMNS =
  'id,email,full_name,username,role,title,department,phone,license_number,avatar_url,is_active,last_login';

function toUserProfile(row: StaffRow): UserProfile {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email ?? '',
    username: row.username ?? undefined,
    role: row.role as UserRole,
    title: row.title ?? '',
    department: row.department ?? '',
    phone: row.phone ?? undefined,
    licenseNumber: row.license_number ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isActive: row.is_active,
    lastLogin: row.last_login ? String(row.last_login).replace('T', ' ').substring(0, 16) : undefined,
  };
}

/** Reads the Edge Function's structured error out of a failed invocation. */
async function describeInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const payload = (await context.clone().json()) as { error?: string };
      if (payload?.error) return payload.error;
    } catch {
      /* fall through to the generic message */
    }
  }
  return (error as Error)?.message ?? 'The staff action failed';
}

async function invokeStaffAdmin(body: Record<string, unknown>): Promise<StaffResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase is not configured for this build.' };
  }
  const { data, error } = await supabase.functions.invoke('staff-admin', { body });
  if (error) return { ok: false, error: await describeInvokeError(error) };
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return { ok: false, error: String(data.error) };
  }
  return { ok: true };
}

export const staffService = {
  /** Authoritative staff list for the signed-in user's facility. */
  async fetchStaff(): Promise<UserProfile[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.from('user_profiles').select(STAFF_COLUMNS).order('full_name');
    if (error) {
      console.error('[supabase] fetch staff failed:', error);
      return null;
    }
    return ((data ?? []) as StaffRow[]).map(toUserProfile);
  },

  create: (draft: StaffDraft, pin: string): Promise<StaffResult> =>
    invokeStaffAdmin({ action: 'create', ...draft, pin }),

  update: (id: string, patch: Partial<StaffDraft>): Promise<StaffResult> =>
    invokeStaffAdmin({ action: 'update', id, ...patch }),

  setPin: (id: string | undefined, pin: string): Promise<StaffResult> =>
    invokeStaffAdmin({ action: 'set_pin', pin, ...(id ? { id } : {}) }),

  setActive: (id: string, isActive: boolean): Promise<StaffResult> =>
    invokeStaffAdmin({ action: 'set_active', id, isActive }),

  remove: (id: string): Promise<StaffResult> => invokeStaffAdmin({ action: 'delete', id }),
};
