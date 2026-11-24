import { z } from 'zod';

/** Stable across feed corrections and shared by desktop, CLI and loader notes. */
export function changelogEntryKey(entry: {
  version: string;
  loader_version?: number;
  cli_version?: number;
}): string {
  if (entry.version) return `app:${entry.version}`;
  if (entry.loader_version !== undefined) return `loader:${entry.loader_version}`;
  return `cli:${entry.cli_version}`;
}

// The rolling feed can publish independently of the API, so keys are validated
// by shape rather than against the API build's (potentially older) bundled feed.
export const changelogKeySchema = z
  .string()
  .max(96)
  .regex(
    /^(?:app:(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?|(?:loader|cli):[1-9]\d*)$/,
  );

export const changelogHeartsQuerySchema = z.object({
  keys: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(changelogKeySchema).min(1).max(100)),
});

export const changelogHeartSchema = z.object({
  key: changelogKeySchema,
  count: z.number().int().nonnegative(),
  hearted: z.boolean(),
});
export const changelogHeartsSchema = z.object({ items: z.array(changelogHeartSchema) });
export type ChangelogHeart = z.infer<typeof changelogHeartSchema>;
