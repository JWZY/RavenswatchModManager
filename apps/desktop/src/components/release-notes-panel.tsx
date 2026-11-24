import { changelogEntryKey } from '@rsmm/schemas';
import { useQuery } from '@tanstack/react-query';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/auth-client';
import { type ChangelogChannel, filterChangelog } from '../lib/changelog';
import { useChangelog } from '../lib/changelog-state';
import { msg } from '../lib/i18n';
import { useT } from '../lib/i18n-react';
import { ChangelogSection } from './changelog-section';

const CHANNELS = [
  { id: 'all', label: msg('All') },
  { id: 'loader', label: msg('Loader') },
  { id: 'cli', label: msg('CLI') },
  { id: 'desktop', label: msg('Desktop app') },
] as const;

/** Optional release history, with the Settings page owning the scroll. */
export function ReleaseNotesPanel() {
  const t = useT();
  const { entries, ready, markRead } = useChangelog();
  const [channel, setChannel] = useState<ChangelogChannel>('all');
  const { data: session, isPending: authPending } = useSession();
  const userId = session?.user.id;
  const keys = entries.map(changelogEntryKey);
  const queryKey = ['changelog-hearts', userId ?? null, keys] as const;
  const reactions = useQuery({
    queryKey,
    queryFn: () => api.changelog.hearts(keys),
    enabled: !authPending && keys.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
  const byKey = new Map(reactions.data?.items.map((item) => [item.key, item]));
  const id = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const visible = filterChangelog(entries, channel);

  useEffect(() => {
    // A direct link can mount before the feed is ready. Only acknowledge app
    // notes if they are included in the filter when the feed arrives.
    if (ready && (channel === 'all' || channel === 'desktop')) markRead();
  }, [ready, channel, markRead]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = CHANNELS.findIndex((item) => item.id === channel);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % CHANNELS.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + CHANNELS.length) % CHANNELS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = CHANNELS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = CHANNELS[nextIndex];
    if (!next) return;
    setChannel(next.id);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <section className="settings-section flex flex-col gap-6">
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={t('Release notes')}
        className="flex flex-wrap items-center gap-x-5 gap-y-2"
        onKeyDown={onKeyDown}
      >
        {CHANNELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-selected={channel === item.id}
            aria-controls={`${id}-panel-${item.id}`}
            tabIndex={channel === item.id ? 0 : -1}
            className={`min-h-[var(--icon-button-size)] rounded font-fraktur text-2xl leading-none transition-colors duration-150 ${channel === item.id ? 'text-parchment' : 'text-ash hover:text-white'}`}
            onClick={() => setChannel(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      {reactions.isError ? (
        <output className="text-sm text-smoke">
          {t('Hearts could not be refreshed.')}{' '}
          <button
            type="button"
            className="text-parchment underline underline-offset-2"
            disabled={reactions.isFetching}
            onClick={() => void reactions.refetch()}
          >
            {t('Retry')}
          </button>
        </output>
      ) : null}
      <div
        role="tabpanel"
        id={`${id}-panel-${channel}`}
        aria-labelledby={`${id}-tab-${channel}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Let keyboard users enter the filtered reading area.
        tabIndex={0}
        className="flex flex-col gap-9"
      >
        {visible.length === 0 ? (
          <p className="font-serif-italic text-smoke">
            {t('No release notes in this category yet.')}
          </p>
        ) : (
          visible.map((entry) => (
            <ChangelogSection
              key={`${userId ?? 'anonymous'}:${changelogEntryKey(entry)}`}
              entry={entry}
              reaction={byKey.get(changelogEntryKey(entry))}
              userId={userId}
              authPending={authPending}
              queryKey={queryKey}
            />
          ))
        )}
      </div>
    </section>
  );
}
