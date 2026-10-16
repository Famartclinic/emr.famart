/**
 * Supabase persistence for the EMR.
 *
 * The app is synchronous and localStorage-first, so this module is deliberately
 * side-car shaped: reads come from localStorage (instant), while hydration pulls
 * the authoritative rows down at startup and every write is mirrored up.
 *
 * Supabase is the source of truth whenever a session exists; without one the app
 * falls back to localStorage exactly as before.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type CollectionName =
  | 'patients'
  | 'patient_queue'
  | 'vitals'
  | 'encounters'
  | 'lab_catalog'
  | 'lab_orders'
  | 'medications'
  | 'prescriptions'
  | 'services'
  | 'invoices'
  | 'nursing_procedures'
  | 'appointments'
  | 'audit_logs'
  | 'notifications';

// ---------------------------------------------------------------------------
// Value conversion
// ---------------------------------------------------------------------------

const camelToSnake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const snakeToCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** ISO/loose timestamp -> the "YYYY-MM-DD HH:mm" shape the UI renders. */
function fromTimestamp(value: unknown, withSeconds = false): string {
  const raw = String(value ?? '').replace('T', ' ');
  return withSeconds ? raw.substring(0, 19) : raw.substring(0, 16);
}

/**
 * App timestamps are UTC strings produced by `toISOString()`, so they are parsed
 * as UTC rather than in the browser's local zone.
 */
function toTimestamp(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim().replace(' ', 'T');
  if (!raw) return null;
  const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(raw)
    ? raw
    : `${raw.length === 16 ? `${raw}:00` : raw}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** PostgREST returns `numeric` as a string to preserve precision; the UI needs numbers. */
const toNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

/** DATE columns reject '' but the UI uses it to mean "unset". */
const toDate = (value: unknown): string | null => {
  const raw = String(value ?? '').trim();
  return raw ? raw.substring(0, 10) : null;
};

const nullIfEmpty = (value: unknown): unknown => {
  if (value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'number' && Number.isNaN(value)) return null;
  return value;
};

// ---------------------------------------------------------------------------
// Collection definitions
// ---------------------------------------------------------------------------

interface ChildSpec {
  key: string;
  table: string;
  fk: string;
  ts?: string[];
  date?: string[];
  num?: string[];
  rename?: Record<string, string>;
  strip?: string[];
  /** Rows without a stable id (encounter amendments) get a deterministic one. */
  syntheticId?: boolean;
}

interface CollectionSpec {
  table: string;
  ts?: string[];
  tsSec?: string[];
  date?: string[];
  time?: string[];
  num?: string[];
  rename?: Record<string, string>;
  children?: ChildSpec[];
  insertOnly?: boolean;
  orderBy?: string;
}

const COLLECTIONS: Record<CollectionName, CollectionSpec> = {
  patients: {
    table: 'patients',
    date: ['dateOfBirth', 'registrationDate'],
    children: [
      { key: 'allergies', table: 'patient_allergies', fk: 'patient_id', ts: ['recordedAt'] },
      {
        key: 'chronicConditions',
        table: 'patient_chronic_conditions',
        fk: 'patient_id',
      },
    ],
  },
  patient_queue: { table: 'patient_queue', ts: ['checkedInAt', 'updatedAt'] },
  vitals: { table: 'vitals', ts: ['recordedAt'], num: ['temperature', 'weightKg', 'heightCm', 'bmi'] },
  encounters: {
    table: 'encounters',
    ts: ['encounterDate'],
    date: ['followUpDate'],
    children: [
      { key: 'diagnoses', table: 'encounter_diagnoses', fk: 'encounter_id' },
      {
        key: 'amendments',
        table: 'encounter_amendments',
        fk: 'encounter_id',
        ts: ['amendedAt'],
        syntheticId: true,
        strip: ['id'],
      },
    ],
  },
  lab_catalog: { table: 'lab_catalog', num: ['priceKes'] },
  lab_orders: {
    table: 'lab_orders',
    ts: ['orderedAt', 'specimenCollectedAt', 'resultsEnteredAt', 'verifiedAt'],
    children: [
      { key: 'items', table: 'lab_order_items', fk: 'lab_order_id', num: ['priceKes'] },
    ],
  },
  medications: { table: 'medications', date: ['expiryDate'], num: ['unitPriceKes'] },
  prescriptions: {
    table: 'prescriptions',
    ts: ['prescribedAt', 'dispensedAt'],
    children: [
      { key: 'items', table: 'prescription_items', fk: 'prescription_id' },
    ],
  },
  services: { table: 'services', num: ['priceKes'] },
  invoices: {
    table: 'invoices',
    ts: ['issuedAt'],
    num: ['subtotalKes', 'discountKes', 'totalKes', 'amountPaidKes', 'balanceKes'],
    children: [
      {
        key: 'items',
        table: 'invoice_items',
        fk: 'invoice_id',
        num: ['unitPriceKes', 'totalPriceKes'],
      },
      { key: 'payments', table: 'payments', fk: 'invoice_id', ts: ['receivedAt'], num: ['amountKes'] },
    ],
  },
  nursing_procedures: {
    table: 'nursing_procedures',
    ts: ['performedAt'],
    num: ['chargeKes'],
  },
  appointments: { table: 'appointments', ts: ['createdAt'], date: ['appointmentDate'], time: ['appointmentTime'] },
  audit_logs: { table: 'audit_logs', tsSec: ['timestamp'], rename: { timestamp: 'created_at' }, insertOnly: true },
  notifications: { table: 'notifications', rename: { timestamp: 'created_at', read: 'is_read' } },
};

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function toRow(entity: Row, spec: CollectionSpec, extra: Row): Row {
  const childKeys = (spec.children ?? []).map((c) => c.key);
  const row: Row = { ...extra };
  for (const [key, value] of Object.entries(entity)) {
    if (childKeys.includes(key)) continue;
    const column = spec.rename?.[key] ?? camelToSnake(key);
    if (spec.ts?.includes(key) || spec.tsSec?.includes(key)) row[column] = toTimestamp(value);
    else if (spec.date?.includes(key)) row[column] = toDate(value);
    else row[column] = nullIfEmpty(value);
  }
  return row;
}

function fromRow(row: Row, spec: CollectionSpec): Row {
  const reverseRename = Object.fromEntries(
    Object.entries(spec.rename ?? {}).map(([app, column]) => [column, app]),
  );
  const childKeys = (spec.children ?? []).map((c) => c.key);
  const out: Row = {};
  for (const [column, value] of Object.entries(row)) {
    if (column === 'facility_id') continue;
    const key = reverseRename[column] ?? snakeToCamel(column);
    if (childKeys.includes(key)) continue;
    if (value === null) continue;
    if (spec.ts?.includes(key)) out[key] = fromTimestamp(value);
    else if (spec.tsSec?.includes(key)) out[key] = fromTimestamp(value, true);
    else if (spec.time?.includes(key)) out[key] = String(value).substring(0, 5);
    else if (spec.date?.includes(key)) out[key] = String(value).substring(0, 10);
    else if (spec.num?.includes(key)) out[key] = toNumber(value);
    else out[key] = value;
  }
  return out;
}

function childToRow(child: Row, spec: ChildSpec, parentId: string, index: number): Row {
  const row: Row = {};
  const id = spec.syntheticId ? `${parentId}-amd-${index}` : child.id;
  row.id = id ?? null;
  row[spec.fk] = parentId;
  for (const [key, value] of Object.entries(child)) {
    if (key === 'id' || key === spec.fk.replace(/_([a-z])/g, (_, c) => c.toUpperCase())) continue;
    const column = spec.rename?.[key] ?? camelToSnake(key);
    if (spec.ts?.includes(key)) row[column] = toTimestamp(value);
    else if (spec.date?.includes(key)) row[column] = toDate(value);
    else row[column] = nullIfEmpty(value);
  }
  return row;
}

function childFromRow(row: Row, spec: ChildSpec): Row {
  const out: Row = {};
  for (const [column, value] of Object.entries(row)) {
    if (column === 'facility_id' || column === spec.fk) continue;
    const key = snakeToCamel(column);
    if (value === null) continue;
    if (spec.ts?.includes(key)) out[key] = fromTimestamp(value);
    else if (spec.date?.includes(key)) out[key] = String(value).substring(0, 10);
    else if (spec.num?.includes(key)) out[key] = toNumber(value);
    else out[key] = value;
  }
  for (const key of spec.strip ?? []) delete out[key];
  return out;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

let facilityId: string | null = null;
let queue: Promise<unknown> = Promise.resolve();

const enabled = () => Boolean(supabase && facilityId);

function report(context: string, error: unknown) {
  console.error(`[supabase] ${context} failed:`, error);
}

/** Serialises writes so rapid successive saves cannot land out of order. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * Tracks collections with an unacknowledged local write so a concurrent realtime
 * refresh cannot momentarily roll the UI back to the pre-write state.
 */
const inFlight = new Map<CollectionName, number>();

export const isPushInFlight = (name: CollectionName): boolean => (inFlight.get(name) ?? 0) > 0;

function track<T>(name: CollectionName, task: () => Promise<T>): Promise<T> {
  inFlight.set(name, (inFlight.get(name) ?? 0) + 1);
  const release = () => inFlight.set(name, Math.max(0, (inFlight.get(name) ?? 1) - 1));
  return enqueue(task).then(
    (value) => {
      release();
      return value;
    },
    (error) => {
      release();
      throw error;
    },
  );
}

/**
 * Resolves the signed-in staff member's facility from the current session.
 * Re-read on demand (rather than cached) so signing in or out takes effect
 * immediately. Returns false when Supabase is unconfigured or nobody is signed
 * in, which keeps the app on localStorage.
 */
export async function initSupabaseSync(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      facilityId = null;
      return false;
    }
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('facility_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) report('profile lookup', error);
    facilityId = (profile?.facility_id as string | undefined) ?? null;
  } catch (error) {
    report('init', error);
    facilityId = null;
  }
  return enabled();
}

/** Called on sign-out so writes stop being mirrored. */
export function clearSupabaseSync(): void {
  facilityId = null;
}

export const isSyncEnabled = () => enabled();

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchCollection(name: CollectionName): Promise<Row[] | null> {
  if (!enabled()) return null;
  const spec = COLLECTIONS[name];
  try {
    const { data, error } = await supabase!
      .from(spec.table)
      .select('*')
      .eq('facility_id', facilityId!)
      .order(spec.orderBy ?? 'created_at', { ascending: false });
    if (error) {
      report(`fetch ${name}`, error);
      return null;
    }

    const rows = (data ?? []).map((row) => fromRow(row as Row, spec));
    if (!spec.children?.length) return rows;

    const parentIds = rows.map((r) => String(r.id));
    if (!parentIds.length) {
      for (const child of spec.children) rows.forEach((r) => (r[child.key] = []));
      return rows;
    }

    const byId = new Map(rows.map((r) => [String(r.id), r]));
    for (const child of spec.children) {
      const { data: childRows, error: childError } = await supabase!
        .from(child.table)
        .select('*')
        .eq('facility_id', facilityId!)
        .in(child.fk, parentIds);
      if (childError) {
        report(`fetch ${child.table}`, childError);
        continue;
      }
      for (const row of childRows ?? []) {
        const parent = byId.get(String((row as Row)[child.fk]));
        if (!parent) continue;
        const list = (parent[child.key] as Row[]) ?? [];
        list.push(childFromRow(row as Row, child));
        parent[child.key] = list;
      }
      rows.forEach((r) => {
        if (!r[child.key]) r[child.key] = [];
      });
    }
    return rows;
  } catch (error) {
    report(`fetch ${name}`, error);
    return null;
  }
}

/** Clinic settings are stored as one key/value row per setting. */
export async function fetchSettings(): Promise<Row | null> {
  if (!enabled()) return null;
  const { data, error } = await supabase!.from('clinic_settings').select('key,value');
  if (error) {
    report('fetch settings', error);
    return null;
  }
  const settings: Row = {};
  for (const row of data ?? []) settings[String((row as Row).key)] = (row as Row).value;
  return settings;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function syncChildren(spec: CollectionSpec, entity: Row, parentId: string) {
  for (const child of spec.children ?? []) {
    const items = Array.isArray(entity[child.key]) ? (entity[child.key] as Row[]) : [];
    const rows: Row[] = items.map((item, index) => ({
      ...childToRow(item, child, parentId, index),
      facility_id: facilityId,
    }));

    if (rows.length) {
      const { error } = await supabase!.from(child.table).upsert(rows, { onConflict: 'id' });
      if (error) report(`upsert ${child.table}`, error);
    }

    const keep = rows.map((r) => r.id).filter(Boolean) as string[];
    let removal = supabase!.from(child.table).delete().eq(child.fk, parentId);
    if (keep.length) removal = removal.not('id', 'in', `(${keep.map((id) => `"${id}"`).join(',')})`);
    const { error: deleteError } = await removal;
    if (deleteError) report(`prune ${child.table}`, deleteError);
  }
}

export async function pushEntity(name: CollectionName, entity: Row): Promise<void> {
  if (name === 'audit_logs') return appendAuditLog(entity);
  if (!enabled()) return;
  const spec = COLLECTIONS[name];
  const id = entity.id === undefined || entity.id === null ? null : String(entity.id);
  const parentId = id ?? `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await track(name, async () => {
    try {
      const row = toRow({ ...entity, id: parentId }, spec, { facility_id: facilityId });
      const { error } = await supabase!.from(spec.table).upsert(row, { onConflict: 'id' });
      if (error) report(`upsert ${name}`, error);
      await syncChildren(spec, { ...entity, id: parentId }, parentId);
    } catch (error) {
      report(`upsert ${name}`, error);
    }
  });
}

/** Audit trail rows are append-only, so they take the direct insert path. */
export async function appendAuditLog(log: Row): Promise<void> {
  if (!enabled()) return;
  const spec = COLLECTIONS.audit_logs;
  await track('audit_logs', async () => {
    try {
      const { error } = await supabase!
        .from(spec.table)
        .insert(toRow(log, spec, { facility_id: facilityId }));
      if (error) report('insert audit log', error);
    } catch (error) {
      report('insert audit log', error);
    }
  });
}

export async function deleteEntity(name: CollectionName, id: string): Promise<void> {
  if (!enabled()) return;
  const spec = COLLECTIONS[name];
  await track(name, async () => {
    try {
      const { error } = await supabase!.from(spec.table).delete().eq('id', id);
      if (error) report(`delete ${name}`, error);
    } catch (error) {
      report(`delete ${name}`, error);
    }
  });
}

export async function replaceEntityFacilityScoped(
  name: CollectionName,
  entities: Row[],
): Promise<void> {
  if (!enabled()) return;
  const spec = COLLECTIONS[name];
  const ids = entities.map((e) => String(e.id));
  await track(name, async () => {
    try {
      let removal = supabase!.from(spec.table).delete().eq('facility_id', facilityId!);
      if (ids.length) {
        removal = removal.not('id', 'in', `(${ids.map((id) => `"${id}"`).join(',')})`);
      }
      const { error: deleteError } = await removal;
      if (deleteError) report(`prune ${name}`, deleteError);
      for (const entity of entities) {
        const row = toRow(entity, spec, { facility_id: facilityId });
        const { error } = await supabase!.from(spec.table).upsert(row, { onConflict: 'id' });
        if (error) report(`upsert ${name}`, error);
        await syncChildren(spec, entity, String(entity.id));
      }
    } catch (error) {
      report(`replace ${name}`, error);
    }
  });
}

export async function pushSettings(settings: Row): Promise<void> {
  if (!enabled()) return;
  const rows = Object.entries(settings)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, value }));
  if (!rows.length) return;
  await enqueue(async () => {
    try {
      const { error } = await supabase!.from('clinic_settings').upsert(rows, { onConflict: 'key' });
      if (error) report('upsert settings', error);
    } catch (error) {
      report('upsert settings', error);
    }
  });
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export type RealtimeSignal = CollectionName | 'staff';

/** Every table we care about, mapped back to the collection it feeds. */
const TABLE_TO_SIGNAL: Record<string, RealtimeSignal> = (() => {
  const map: Record<string, RealtimeSignal> = { user_profiles: 'staff' };
  for (const name of Object.keys(COLLECTIONS) as CollectionName[]) {
    const spec = COLLECTIONS[name];
    map[spec.table] = name;
    for (const child of spec.children ?? []) map[child.table] = name;
  }
  return map;
})();

/**
 * Subscribes to Postgres changes for every synced table and reports which
 * collections were touched, debounced so a burst of writes causes one refresh.
 *
 * The events are only used as a "something changed" signal — the refresh goes
 * back through PostgREST so RLS stays authoritative and no row data is trusted
 * from the socket.
 */
export function startRealtime(onSignal: (signal: RealtimeSignal) => void): () => void {
  if (!supabase) return () => undefined;

  const pending = new Set<RealtimeSignal>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    const signals = [...pending];
    pending.clear();
    signals.forEach(onSignal);
  };

  const queueSignal = (signal: RealtimeSignal) => {
    pending.add(signal);
    if (timer === undefined) timer = setTimeout(flush, 300);
  };

  const channel = supabase.channel('famart-emr-changes');
  for (const table of Object.keys(TABLE_TO_SIGNAL)) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      queueSignal(TABLE_TO_SIGNAL[table]);
    });
  }
  channel.subscribe();

  return () => {
    if (timer !== undefined) clearTimeout(timer);
    void supabase?.removeChannel(channel);
  };
}
