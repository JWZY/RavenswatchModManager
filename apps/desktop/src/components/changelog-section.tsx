import { type ChangelogHeart, changelogEntryKey } from '@rsmm/schemas';
import type { ChangelogEntry } from '../lib/changelog';
import { useT } from '../lib/i18n-react';
import { ChangelogHeartButton } from './changelog-heart';
import { MonoTag } from './chrome';

/** One release's notes. Shown in Settings → Release notes. */
export function ChangelogSection({
  entry,
  reaction,
  userId,
  authPending,
  queryKey,
}: {
  entry: ChangelogEntry;
  reaction?: ChangelogHeart;
  userId?: string;
  authPending: boolean;
  queryKey: readonly unknown[];
}) {
  const t = useT();
  const release = entry.version
    ? `v${entry.version}`
    : entry.loader_version !== undefined
      ? t('Loader v{n}', { n: entry.loader_version })
      : t('CLI v{n}', { n: entry.cli_version ?? 0 });
  return (
    <section className="space-y-2">
      <header className="flex flex-wrap items-center gap-3">
        <h3 className="font-fraktur text-xl text-parchment">{release}</h3>
        <span className="flex-1 border-b border-dotted border-oxblood/40" aria-hidden />
        <MonoTag>{entry.date}</MonoTag>
        <ChangelogHeartButton
          entryKey={changelogEntryKey(entry)}
          release={release}
          reaction={reaction}
          userId={userId}
          authPending={authPending}
          queryKey={queryKey}
        />
      </header>
      {entry.summary ? (
        <p className="font-serif-italic text-ash leading-relaxed">{entry.summary}</p>
      ) : null}
      <ul className="list-outside list-disc space-y-2 pl-4 marker:text-gilt">
        {entry.highlights.map((line) => (
          <li key={line} className="font-serif-italic leading-relaxed text-smoke">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
