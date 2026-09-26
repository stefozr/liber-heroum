// The realtime seam must never hand the app a hollow hero. Supabase Realtime
// truncates any change record over max_record_bytes (1 MiB) to the columns whose
// value is ≤ 64 bytes and sets errors: ['Error 413: Payload Too Large'] — so a
// hero row arrives with id/owner/status but no `data`. subscribeCharacters must
// refetch such a row and forward the real thing, or drop the event.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const fake = vi.hoisted(() => {
  const state: any = { handler: null as null | ((payload: any) => void), rows: {} as Record<string, any> };
  const channel: any = {
    on: vi.fn((_event: string, _filter: any, cb: (p: any) => void) => { state.handler = cb; return channel; }),
    subscribe: vi.fn(() => channel),
  };
  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => ({ data: state.rows[id] || null, error: null }),
        }),
      }),
    })),
    auth: { onAuthStateChange: vi.fn(), getUser: vi.fn() },
    storage: { from: vi.fn() },
  };
  return { state, supabase };
});

vi.mock('../supabaseClient.ts', () => ({ supabase: fake.supabase }));

// The module is imported after a reset so the mocked client above is the one it
// binds to (a setup file may already have loaded the real backend).
let DS: any;
let isTruncatedPayload: (p: any) => boolean;
beforeAll(async () => {
  vi.resetModules();
  ({ DS, isTruncatedPayload } = await import('../backend.jsx'));
});

const FULL_ROW = {
  id: 'c1', owner_id: 'u1', campaign_id: null, status: 'complete', level: 2, visibility: 'private', name: 'Jack Crow',
  data: { id: 'c1', name: 'Jack Crow', career: { id: 'agent' }, cclass: { id: 'shadow' }, ancestry: { id: 'human' } },
};
const TRUNCATED_ROW = { id: 'c1', owner_id: 'u1', campaign_id: null, status: 'complete', level: 2, visibility: 'private' };

describe('isTruncatedPayload', () => {
  it('is true when Realtime reports the record was too large', () => {
    expect(isTruncatedPayload({ eventType: 'UPDATE', new: FULL_ROW, errors: ['Error 413: Payload Too Large'] })).toBe(true);
  });

  it('is true when the data blob is missing from the record', () => {
    expect(isTruncatedPayload({ eventType: 'UPDATE', new: TRUNCATED_ROW, errors: null })).toBe(true);
  });

  it('is false for a complete record', () => {
    expect(isTruncatedPayload({ eventType: 'UPDATE', new: FULL_ROW, errors: null })).toBe(false);
    expect(isTruncatedPayload({ eventType: 'UPDATE', new: FULL_ROW })).toBe(false);
  });
});

describe('subscribeCharacters', () => {
  beforeEach(() => {
    fake.state.handler = null;
    fake.state.rows = {};
    fake.supabase.from.mockClear();
  });

  it('hydrates a complete record straight through', () => {
    const onUpsert = vi.fn();
    DS.subscribeCharacters(onUpsert, vi.fn());
    fake.state.handler!({ eventType: 'UPDATE', new: FULL_ROW, errors: null });
    expect(onUpsert).toHaveBeenCalledTimes(1);
    const hero = onUpsert.mock.calls[0][0];
    expect(hero.career.id).toBe('agent');
    expect(hero.ownerId).toBe('u1');
    expect(fake.supabase.from).not.toHaveBeenCalled();
  });

  it('refetches a truncated record and forwards the full hero', async () => {
    fake.state.rows.c1 = FULL_ROW;
    const onUpsert = vi.fn();
    DS.subscribeCharacters(onUpsert, vi.fn());
    fake.state.handler!({ eventType: 'UPDATE', new: TRUNCATED_ROW, errors: ['Error 413: Payload Too Large'] });
    await vi.waitFor(() => expect(onUpsert).toHaveBeenCalledTimes(1));
    const hero = onUpsert.mock.calls[0][0];
    expect(hero.career.id).toBe('agent');
    expect(hero.cclass.id).toBe('shadow');
    expect(fake.supabase.from).toHaveBeenCalledWith('characters');
  });

  it('drops the event when the refetch finds nothing', async () => {
    const onUpsert = vi.fn();
    DS.subscribeCharacters(onUpsert, vi.fn());
    fake.state.handler!({ eventType: 'UPDATE', new: TRUNCATED_ROW, errors: null });
    await new Promise(r => setTimeout(r, 10));
    expect(onUpsert).not.toHaveBeenCalled();
  });

  it('still forwards deletes by id', () => {
    const onDelete = vi.fn();
    DS.subscribeCharacters(vi.fn(), onDelete);
    fake.state.handler!({ eventType: 'DELETE', old: { id: 'c9' } });
    expect(onDelete).toHaveBeenCalledWith('c9');
  });
});
