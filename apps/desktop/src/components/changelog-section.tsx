import type { ChangelogEntry } from '../lib/changelog';
import { useT } from '../lib/i18n-react';
import { MonoTag } from './chrome';

/** One release's notes. Shown in Settings → Release notes. */
export function ChangelogSection({ entry }: { entry: ChangelogEntry }) {
  const t = useT();
  return (
    <section className="space-y-2">
      <header className="flex items-baseline gap-3">
        <h3 className="font-fraktur text-xl text-parchment">
          {entry.version
            ? `v${entry.version}`
            : entry.loader_version !== undefined
              ? t('Loader v{n}', { n: entry.loader_version })
              : t('CLI v{n}', { n: entry.cli_version ?? 0 })}
        </h3>
        <span className="flex-1 border-b border-dotted border-oxblood/40" aria-hidden />
        <MonoTag>{entry.date}</MonoTag>
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
