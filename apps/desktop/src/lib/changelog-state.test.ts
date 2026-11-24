import { beforeEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../package.json';
import type { ChangelogEntry } from './changelog';

const mocks = vi.hoisted(() => ({ load: vi.fn(), version: vi.fn() }));
vi.mock('./changelog', async (original) => ({
  ...(await original<typeof import('./changelog')>()),
  loadChangelog: mocks.load,
}));
vi.mock('./updater', () => ({ getAppVersion: mocks.version }));

const entries: ChangelogEntry[] = [
  { version: '6.1.1', date: '2026-11-22', highlights: ['Current release'] },
  { version: '6.1.0', date: '2026-11-21', highlights: ['Previous release'] },
];

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  mocks.load.mockReset().mockResolvedValue(entries);
  mocks.version.mockReset().mockResolvedValue('6.1.1');
});

describe('optional release notes', () => {
  it('keeps an upgrade unread until the notes are explicitly opened', async () => {
    localStorage.setItem('rsmm:changelog-seen', '6.1.0');
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    await initializeChangelog(true);
    expect(useChangelog.getState().unread).toBe(true);
    expect(localStorage.getItem('rsmm:changelog-seen')).toBe('6.1.0');

    // Launching again without opening the notes keeps the indicator.
    vi.resetModules();
    const next = await import('./changelog-state');
    await next.initializeChangelog(true);
    expect(next.useChangelog.getState().unread).toBe(true);
    next.useChangelog.getState().markRead();
    expect(next.useChangelog.getState().unread).toBe(false);
    expect(localStorage.getItem('rsmm:changelog-seen')).toBe('6.1.1');

    vi.resetModules();
    const read = await import('./changelog-state');
    await read.initializeChangelog(true);
    expect(read.useChangelog.getState().unread).toBe(false);
  });

  it('silently seeds a fresh install, then flags the next release', async () => {
    const first = await import('./changelog-state');
    await first.initializeChangelog(false);
    expect(first.useChangelog.getState().unread).toBe(false);
    expect(localStorage.getItem('rsmm:changelog-seen')).toBe('6.1.1');

    vi.resetModules();
    mocks.version.mockResolvedValue('6.1.2');
    mocks.load.mockResolvedValue([
      { version: '6.1.2', date: '2026-11-24', highlights: ['Next release'] },
      ...entries,
    ]);
    const next = await import('./changelog-state');
    await next.initializeChangelog(true);
    expect(next.useChangelog.getState().unread).toBe(true);
  });

  it('flags notes for returning users without a legacy read marker', async () => {
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    await initializeChangelog(true);
    expect(useChangelog.getState().unread).toBe(true);
    expect(localStorage.getItem('rsmm:changelog-seen')).toBeNull();
  });

  it('does not roll the read marker backward on a downgrade', async () => {
    localStorage.setItem('rsmm:changelog-seen', '6.2.0');
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    await initializeChangelog(true);
    expect(useChangelog.getState().unread).toBe(false);
    useChangelog.getState().markRead();
    expect(localStorage.getItem('rsmm:changelog-seen')).toBe('6.2.0');
  });

  it('hides future app notes but retains independent loader and CLI notes', async () => {
    const loader = { version: '', loader_version: 99, date: '2026-11-23', highlights: ['Loader'] };
    const cli = { version: '', cli_version: 12, date: '2026-11-23', highlights: ['CLI'] };
    mocks.load.mockResolvedValue([
      { version: '6.2.0', date: '2026-11-24', highlights: ['Future app'] },
      loader,
      cli,
      ...entries,
    ]);
    localStorage.setItem('rsmm:changelog-seen', '6.1.1');
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    await initializeChangelog(true);
    expect(useChangelog.getState().entries).toEqual([loader, cli, ...entries]);
    expect(useChangelog.getState().unread).toBe(false);
  });

  it('deduplicates startup reads and does not acknowledge notes while loading', async () => {
    localStorage.setItem('rsmm:changelog-seen', '6.1.0');
    let finish: (value: ChangelogEntry[]) => void = () => {};
    mocks.load.mockReturnValue(
      new Promise<ChangelogEntry[]>((resolve) => {
        finish = resolve;
      }),
    );
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    const first = initializeChangelog(true);
    const second = initializeChangelog(true);
    expect(first).toBe(second);
    useChangelog.getState().markRead();
    expect(localStorage.getItem('rsmm:changelog-seen')).toBe('6.1.0');
    finish(entries);
    await first;
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(useChangelog.getState().unread).toBe(true);
  });

  it('uses the bundled version if the native version is unavailable', async () => {
    mocks.version.mockRejectedValue(new Error('Native API unavailable'));
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    await initializeChangelog(true);
    expect(useChangelog.getState().current).toBe(pkg.version);
    expect(useChangelog.getState().ready).toBe(true);
  });

  it('still clears the indicator for this session when persistence fails', async () => {
    localStorage.setItem('rsmm:changelog-seen', '6.1.0');
    const { initializeChangelog, useChangelog } = await import('./changelog-state');
    await initializeChangelog(true);
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    try {
      expect(() => useChangelog.getState().markRead()).not.toThrow();
      expect(useChangelog.getState().unread).toBe(false);
    } finally {
      write.mockRestore();
    }
  });
});
