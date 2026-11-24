import type { SQL } from 'drizzle-orm';
import { PgDialect, getTableConfig } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../src/types.js';

const state = vi.hoisted(() => ({
  rows: new Map<string, Set<string>>(),
  writes: 0,
  params: [] as unknown[],
}));

// Keep the real schema and SQL expressions: predicates must bind the session
// user's id, and the conflict handling must use the table's composite key.
vi.mock('@rsmm/db', async (original) => {
  const actual = await original<typeof import('@rsmm/db')>();
  const dialect = new PgDialect();
  return {
    ...actual,
    getDb: () => ({
      select: (fields: { hearted: SQL }) => ({
        from: () => ({
          where: (condition: SQL) => ({
            groupBy: async () => {
              const keys = dialect.sqlToQuery(condition).params as string[];
              const [viewer] = dialect.sqlToQuery(fields.hearted).params;
              return keys.flatMap((key) => {
                const users = state.rows.get(key);
                return users?.size
                  ? [{ key, count: users.size, hearted: users.has(String(viewer)) }]
                  : [];
              });
            },
          }),
        }),
      }),
      insert: () => ({
        values: (row: { entryKey: string; userId: string }) => ({
          onConflictDoNothing: async () => {
            state.writes++;
            const users = state.rows.get(row.entryKey) ?? new Set<string>();
            users.add(row.userId);
            state.rows.set(row.entryKey, users);
          },
        }),
      }),
      delete: () => ({
        where: async (condition: SQL) => {
          state.writes++;
          state.params = dialect.sqlToQuery(condition).params;
          const [key, user] = state.params as string[];
          state.rows.get(key)?.delete(user);
        },
      }),
    }),
  };
});

const { changelogRouter } = await import('../src/routes/changelog.js');
const { schema } = await import('@rsmm/db');

function appAs(userId: string | null, authMethod: 'session' | 'token' = 'session') {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('user', userId ? ({ id: userId } as AppEnv['Variables']['user']) : null);
    c.set('authMethod', userId ? authMethod : null);
    await next();
  });
  app.route('/api/changelog', changelogRouter);
  return app;
}
const write = (user: string | null, key = 'app:6.1.1', method = 'PUT') =>
  appAs(user).request(`/api/changelog/${encodeURIComponent(key)}/heart`, { method });
const read = (user: string | null, keys = ['app:6.1.1']) =>
  appAs(user).request(`/api/changelog/hearts?${new URLSearchParams({ keys: keys.join(',') })}`);

beforeEach(() => {
  state.rows.clear();
  state.writes = 0;
  state.params = [];
});

describe('release note hearts', () => {
  it('requires a cookie session for both mutations', async () => {
    for (const method of ['PUT', 'DELETE']) {
      expect((await write(null, 'app:6.1.1', method)).status).toBe(401);
      expect(
        (await appAs('publisher', 'token').request('/api/changelog/app:6.1.1/heart', { method }))
          .status,
      ).toBe(401);
    }
    expect(state.writes).toBe(0);
  });

  it('returns zero for unseen notes and never exposes reactor identities', async () => {
    state.rows.set('app:6.1.1', new Set(['alice', 'bob']));
    const res = await read(null, ['app:6.1.1', 'loader:66', 'cli:48']);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({
      items: [
        { key: 'app:6.1.1', count: 2, hearted: false },
        { key: 'loader:66', count: 0, hearted: false },
        { key: 'cli:48', count: 0, hearted: false },
      ],
    });
    expect(await (await read('alice')).json()).toEqual({
      items: [{ key: 'app:6.1.1', count: 2, hearted: true }],
    });
  });

  it('adds once per account even on repeated or concurrent PUTs', async () => {
    const results = await Promise.all([write('alice'), write('alice'), write('bob')]);
    expect(results.every((res) => res.status === 200)).toBe(true);
    expect(await (await read('alice')).json()).toEqual({
      items: [{ key: 'app:6.1.1', count: 2, hearted: true }],
    });
    const config = getTableConfig(schema.changelogHearts);
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'entry_key',
      'user_id',
    ]);
    expect(config.foreignKeys[0]?.onDelete).toBe('cascade');
  });

  it('only removes the current account’s heart and repeated deletes stay at zero', async () => {
    state.rows.set('app:6.1.1', new Set(['alice', 'bob']));
    expect(await (await write('alice', 'app:6.1.1', 'DELETE')).json()).toEqual({
      key: 'app:6.1.1',
      count: 1,
      hearted: false,
    });
    expect(state.params).toEqual(['app:6.1.1', 'alice']);
    await write('alice', 'app:6.1.1', 'DELETE');
    expect(state.rows.get('app:6.1.1')).toEqual(new Set(['bob']));
    await write('bob', 'app:6.1.1', 'DELETE');
    expect(await (await write('bob', 'app:6.1.1', 'DELETE')).json()).toEqual({
      key: 'app:6.1.1',
      count: 0,
      hearted: false,
    });
  });

  it('separates desktop, loader and CLI notes and accepts new rolling builds', async () => {
    for (const key of ['app:6.1.1', 'loader:999', 'cli:999']) await write('alice', key);
    const res = await read('alice', ['loader:999', 'cli:999', 'app:6.1.1', 'app:6.1.1']);
    expect((await res.json()).items).toHaveLength(3);
  });

  it('rejects malformed keys and unbounded read batches before accessing data', async () => {
    for (const key of ['app:bad', 'loader:-1', 'cli:0', 'app:6.1.1,cli:48', 'a'.repeat(97)]) {
      expect((await write('alice', key)).status).toBe(400);
    }
    expect((await read(null, [])).status).toBe(400);
    expect(
      (
        await read(
          null,
          Array.from({ length: 101 }, (_, i) => `cli:${i + 1}`),
        )
      ).status,
    ).toBe(400);
    expect(state.writes).toBe(0);
  });

  it('limits writes per account without sharing another account’s bucket', async () => {
    for (let i = 0; i < 60; i++) expect((await write('rate-test')).status).toBe(200);
    expect((await write('rate-test')).status).toBe(429);
    expect((await write('other-rate-test')).status).toBe(200);
  });
});
