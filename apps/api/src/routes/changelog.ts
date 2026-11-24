import { zValidator } from '@hono/zod-validator';
import { getDb, schema } from '@rsmm/db';
import { changelogHeartsQuerySchema, changelogKeySchema } from '@rsmm/schemas';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createRateLimiter } from '../rate-limit.js';
import type { AppEnv } from '../types.js';

export const changelogRouter = new Hono<AppEnv>();
const hearts = schema.changelogHearts;

async function summaries(keys: string[], userId: string | null) {
  const rows = await getDb()
    .select({
      key: hearts.entryKey,
      count: count(),
      hearted: sql<boolean>`coalesce(bool_or(${hearts.userId} = ${userId}), false)`,
    })
    .from(hearts)
    .where(inArray(hearts.entryKey, keys))
    .groupBy(hearts.entryKey);
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return keys.map((key) => byKey.get(key) ?? { key, count: 0, hearted: false });
}

// Responses include only totals and the current viewer's state, never identities.
changelogRouter.use('*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});

changelogRouter.get('/hearts', zValidator('query', changelogHeartsQuerySchema), async (c) => {
  const keys = [...new Set(c.req.valid('query').keys)];
  return c.json({ items: await summaries(keys, c.get('user')?.id ?? null) });
});

changelogRouter.use('/:key/heart', async (c, next) => {
  if (!c.get('user') || c.get('authMethod') !== 'session') {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});
changelogRouter.use(
  '/:key/heart',
  createRateLimiter({
    name: 'changelog-heart',
    windowMs: 60_000,
    maxHits: 60,
    keyFrom: (c) => c.get('user').id,
  }),
);

changelogRouter.on(['PUT', 'DELETE'], '/:key/heart', async (c) => {
  const parsed = changelogKeySchema.safeParse(c.req.param('key'));
  if (!parsed.success) return c.json({ error: 'invalid release note key' }, 400);
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  const key = parsed.data;
  const db = getDb();
  if (c.req.method === 'PUT') {
    // The primary key makes retries and concurrent clicks idempotent.
    await db.insert(hearts).values({ entryKey: key, userId: user.id }).onConflictDoNothing();
  } else {
    await db.delete(hearts).where(and(eq(hearts.entryKey, key), eq(hearts.userId, user.id)));
  }
  const [summary] = await summaries([key], user.id);
  return c.json(summary);
});
