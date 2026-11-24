import type { ChangelogHeart } from '@rsmm/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { api } from '../lib/api';
import { useT } from '../lib/i18n-react';
import { useToast } from './toast';

export function ChangelogHeartButton({
  entryKey,
  release,
  reaction,
  userId,
  authPending,
  queryKey,
}: {
  entryKey: string;
  release: string;
  reaction?: ChangelogHeart;
  userId?: string;
  authPending: boolean;
  queryKey: readonly unknown[];
}) {
  const t = useT();
  const toast = useToast();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.changelog.setHeart(entryKey, !reaction?.hearted),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (updated) => {
      client.setQueryData<{ items: ChangelogHeart[] }>(queryKey, (previous) =>
        previous
          ? { items: previous.items.map((item) => (item.key === entryKey ? updated : item)) }
          : previous,
      );
    },
    onError: () => toast.push(t('Could not save your heart. Please try again.'), 'error'),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const count = reaction ? reaction.count.toLocaleString(t.tag) : '—';
  const className = `registry-tag bg-surface-2 hover:bg-char/65 transition-colors duration-150 ${reaction?.hearted ? 'text-crimson hover:text-parchment' : 'text-smoke hover:text-parchment'} disabled:pointer-events-none disabled:opacity-50`;
  const content = (
    <>
      <Heart aria-hidden="true" fill={reaction?.hearted ? 'currentColor' : 'none'} />
      <span className="tabular-nums" aria-hidden="true">
        {count}
      </span>
    </>
  );
  if (!authPending && !userId) {
    const label = t('Sign in to heart {release} ({count} total)', { release, count });
    return (
      <Link to="/signin" className={className} aria-label={label} title={label}>
        {content}
      </Link>
    );
  }
  const label = !reaction
    ? t('Hearts unavailable for {release}', { release })
    : reaction.hearted
      ? t('Remove heart from {release} ({count} total)', { release, count })
      : t('Heart {release} ({count} total)', { release, count });
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      aria-pressed={reaction?.hearted ?? false}
      aria-busy={mutation.isPending}
      disabled={authPending || !reaction || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {content}
    </button>
  );
}
