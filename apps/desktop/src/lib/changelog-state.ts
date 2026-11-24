import { create } from 'zustand';
import pkg from '../../package.json';
import { BUNDLED_CHANGELOG, type ChangelogEntry, loadChangelog, pendingEntries } from './changelog';
import { changelogSeen, markChangelogSeen } from './first-run';
import { getAppVersion } from './updater';
import { compareVersions } from './version';

interface ChangelogState {
  entries: ChangelogEntry[];
  current: string;
  ready: boolean;
  unread: boolean;
  markRead: () => void;
}

/** Shared by the Settings link, Release notes category, and its panel. */
export const useChangelog = create<ChangelogState>((set, get) => ({
  entries: BUNDLED_CHANGELOG,
  current: pkg.version,
  ready: false,
  unread: false,
  markRead: () => {
    const { ready, current } = get();
    if (!ready) return;
    rememberVersion(current);
    set({ unread: false });
  },
}));

/** A rollback must not make already-read releases unread on the next upgrade. */
function rememberVersion(current: string): void {
  const seen = changelogSeen();
  if (seen === null || compareVersions(current, seen) > 0) markChangelogSeen(current);
}

let loading: Promise<void> | undefined;

/** One feed read per launch, shared even when React remounts in Strict Mode. */
export function initializeChangelog(hasRunBefore: boolean): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const [current, available] = await Promise.all([
      getAppVersion()
        .catch(() => null)
        .then((version) => version || pkg.version),
      loadChangelog(),
    ]);
    const unread =
      pendingEntries({
        entries: available,
        seen: changelogSeen(),
        current,
        hasRunBefore,
      }).length > 0;
    // A first install (or a release without notes) still needs a baseline.
    if (!unread) rememberVersion(current);
    useChangelog.setState({
      current,
      // A rolling feed can describe an app release newer than this install.
      entries: available.filter(
        (entry) => !entry.version || compareVersions(entry.version, current) <= 0,
      ),
      ready: true,
      unread,
    });
  })();
  return loading;
}
