/**
 * Staff administration.
 *
 * Creating, updating and deleting auth users requires the service-role key, so it
 * happens here (server-side) rather than in the browser. The caller is authorised
 * from their own JWT: administrators may manage staff in their facility, and any
 * signed-in user may change their own PIN.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ROLES = [
  'admin',
  'receptionist',
  'nurse',
  'doctor',
  'lab_technician',
  'pharmacist',
  'billing_cashier',
] as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

/**
 * Supabase Auth enforces a 6-character minimum, so the 4-digit PIN is expanded
 * into a deterministic credential. The effective entropy is still the 4 digits.
 * Keep this in sync with src/services/staffPin.ts.
 */
const pinToPassword = (pin: string) => `famart-${pin}`;
const isValidPin = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}$/.test(value);

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Missing bearer token' }, 401);

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Not authenticated' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: callerProfile } = await admin
    .from('user_profiles')
    .select('id, role, facility_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!callerProfile) return json({ error: 'No staff profile for this account' }, 403);
  if (!callerProfile.is_active) return json({ error: 'This account is deactivated' }, 403);

  const facilityId = callerProfile.facility_id as string | null;
  const isAdmin = callerProfile.role === 'admin';

  if (!facilityId) return json({ error: 'Your account is not attached to a facility' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = trimmed(body.action);

  /** Number of other admins who could still administer the facility. */
  const otherActiveAdmins = async (excludeId: string) => {
    const { count } = await admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .eq('role', 'admin')
      .eq('is_active', true)
      .neq('id', excludeId);
    return count ?? 0;
  };

  // --- Any signed-in user may change their own PIN ---------------------------
  if (action === 'set_pin') {
    const targetId = isAdmin && body.id ? trimmed(body.id) : user.id;
    if (targetId !== user.id && !isAdmin) return json({ error: 'Not permitted' }, 403);
    if (!isValidPin(body.pin)) return json({ error: 'PIN must be exactly 4 digits' }, 400);

    const { error } = await admin.auth.admin.updateUserById(targetId, {
      password: pinToPassword(body.pin),
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (!isAdmin) return json({ error: 'Administrator role required' }, 403);

  switch (action) {
    // --- Create ------------------------------------------------------------
    case 'create': {
      const email = trimmed(body.email).toLowerCase();
      const fullName = trimmed(body.fullName);
      const role = trimmed(body.role);

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
      if (!fullName) return json({ error: 'Full name is required' }, 400);
      if (!ROLES.includes(role as (typeof ROLES)[number])) return json({ error: 'Invalid role' }, 400);
      if (!isValidPin(body.pin)) return json({ error: 'PIN must be exactly 4 digits' }, 400);

      const created = await admin.auth.admin.createUser({
        email,
        password: pinToPassword(body.pin),
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (created.error || !created.data.user) {
        return json({ error: created.error?.message ?? 'Could not create the account' }, 400);
      }

      // handle_new_user() already inserted a default row, so merge onto it.
      const { error: profileError } = await admin.from('user_profiles').upsert(
        {
          id: created.data.user.id,
          email,
          full_name: fullName,
          username: trimmed(body.username) || null,
          role,
          title: trimmed(body.title) || null,
          department: trimmed(body.department) || null,
          phone: trimmed(body.phone) || null,
          license_number: trimmed(body.licenseNumber) || null,
          facility_id: facilityId,
          is_active: true,
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        // Don't leave an orphaned login behind.
        await admin.auth.admin.deleteUser(created.data.user.id);
        return json({ error: profileError.message }, 400);
      }
      return json({ ok: true, id: created.data.user.id });
    }

    // --- Update profile details -------------------------------------------
    case 'update': {
      const id = trimmed(body.id);
      if (!id) return json({ error: 'Staff id is required' }, 400);

      const { data: target } = await admin
        .from('user_profiles')
        .select('id, role, facility_id, is_active, email')
        .eq('id', id)
        .maybeSingle();
      if (!target || target.facility_id !== facilityId) return json({ error: 'Staff member not found' }, 404);

      const patch: Record<string, unknown> = {};
      for (const [from, to] of [
        ['fullName', 'full_name'],
        ['username', 'username'],
        ['title', 'title'],
        ['department', 'department'],
        ['phone', 'phone'],
        ['licenseNumber', 'license_number'],
      ] as const) {
        if (body[from] !== undefined) patch[to] = trimmed(body[from]) || null;
      }

      const nextRole = body.role !== undefined ? trimmed(body.role) : undefined;
      if (nextRole !== undefined) {
        if (!ROLES.includes(nextRole as (typeof ROLES)[number])) return json({ error: 'Invalid role' }, 400);
        if (target.role === 'admin' && nextRole !== 'admin' && (await otherActiveAdmins(id)) === 0) {
          return json({ error: 'This is the only active administrator — promote someone else first' }, 400);
        }
        patch.role = nextRole;
      }

      if (Object.keys(patch).length) {
        const { error } = await admin.from('user_profiles').update(patch).eq('id', id);
        if (error) return json({ error: error.message }, 400);
      }

      if (body.pin !== undefined) {
        if (!isValidPin(body.pin)) return json({ error: 'PIN must be exactly 4 digits' }, 400);
        const { error } = await admin.auth.admin.updateUserById(id, { password: pinToPassword(body.pin) });
        if (error) return json({ error: error.message }, 400);
      }

      return json({ ok: true });
    }

    // --- Activate / deactivate --------------------------------------------
    case 'set_active': {
      const id = trimmed(body.id);
      const isActive = body.isActive === true;
      if (!id) return json({ error: 'Staff id is required' }, 400);
      if (id === user.id && !isActive) return json({ error: 'You cannot deactivate your own account' }, 400);

      const { data: target } = await admin
        .from('user_profiles')
        .select('id, role, facility_id')
        .eq('id', id)
        .maybeSingle();
      if (!target || target.facility_id !== facilityId) return json({ error: 'Staff member not found' }, 404);

      if (!isActive && target.role === 'admin' && (await otherActiveAdmins(id)) === 0) {
        return json({ error: 'This is the only active administrator' }, 400);
      }

      const { error } = await admin.from('user_profiles').update({ is_active: isActive }).eq('id', id);
      if (error) return json({ error: error.message }, 400);

      // Block sign-in for deactivated staff.
      const { error: banError } = await admin.auth.admin.updateUserById(id, {
        ban_duration: isActive ? 'none' : '876000h',
      });
      if (banError) return json({ error: banError.message }, 400);

      return json({ ok: true });
    }

    // --- Delete ------------------------------------------------------------
    case 'delete': {
      const id = trimmed(body.id);
      if (!id) return json({ error: 'Staff id is required' }, 400);
      if (id === user.id) return json({ error: 'You cannot delete your own account' }, 400);

      const { data: target } = await admin
        .from('user_profiles')
        .select('id, role, facility_id, is_active')
        .eq('id', id)
        .maybeSingle();
      if (!target || target.facility_id !== facilityId) return json({ error: 'Staff member not found' }, 404);

      if (target.role === 'admin' && target.is_active && (await otherActiveAdmins(id)) === 0) {
        return json({ error: 'This is the only active administrator' }, 400);
      }

      // The user_profiles row is removed by the FK cascade.
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: `Unknown action: ${action || '(none)'}` }, 400);
  }
});
