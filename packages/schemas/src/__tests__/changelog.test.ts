import { describe, expect, it } from 'vitest';
import feed from '../../../../data/changelog.json';
import { changelogEntryKey, changelogKeySchema } from '../changelog';

describe('release note identities', () => {
  it('accepts every bundled note without key collisions', () => {
    const keys = feed.entries.map(changelogEntryKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(changelogKeySchema.safeParse(key).success, key).toBe(true);
  });

  it('keeps release identity ahead of bundled loader and CLI metadata', () => {
    expect(changelogEntryKey({ version: '6.1.1', loader_version: 66, cli_version: 48 })).toBe(
      'app:6.1.1',
    );
    expect(changelogEntryKey({ version: '', loader_version: 66, cli_version: 48 })).toBe(
      'loader:66',
    );
    expect(changelogEntryKey({ version: '', cli_version: 48 })).toBe('cli:48');
    expect(changelogKeySchema.safeParse('app:7.0.0-beta.1+build.2').success).toBe(true);
  });
});
