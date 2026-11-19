import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { inTauri } from '../../lib/platform';
import { attachSmoothWheel } from '../../lib/smooth-scroll';
import { trackMainWindow } from '../../lib/window-state';
import { activeProfile, detectConflicts, isEnabledIn, useApp } from '../../store';
import { AccountStrip } from '../account-strip';
import { ChannelStatusBanner } from '../channel-status-banner';
import { useToast } from '../toast';
import { UpdaterBanner } from '../updater';
import { useBookTurn } from './use-book-turn';

const chapters = [
  {
    to: '/browse',
    label: 'Browse',
    numeral: 'I',
  },
  {
    to: '/',
    label: 'Library',
    numeral: 'II',
  },
  {
    to: '/settings',
    label: 'Settings',
    numeral: 'III',
  },
] as const;

function chapterIndex(path: string): number {
  if (path === '/browse' || path.startsWith('/mod/') || path.startsWith('/collection/')) return 0;
  if (path === '/' || path === '/profiles' || path === '/conflicts') return 1;
  return 2;
}

export function readBookPreference(): boolean {
  try {
    return localStorage.getItem('rsmm.grimoire.shell.v1') !== 'classic';
  } catch {
    return true;
  }
}

function readBookmarks(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('rsmm.grimoire.bookmarks.v1') ?? '[]');
    return Array.isArray(saved)
      ? saved.filter(
          (item): item is string =>
            typeof item === 'string' && chapters.some((chapter) => chapter.to === item),
        )
      : [];
  } catch {
    return [];
  }
}

export function GrimoireShell({
  launch,
  windowControls,
  onUseClassic,
}: {
  launch: ReactNode;
  windowControls: ReactNode;
  onUseClassic: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const current = chapterIndex(location.pathname);
  const chapter = chapters[current] ?? chapters[0];
  const isChapterCover = location.pathname === chapter.to;
  const profile = useApp(activeProfile);
  const localMods = useApp((s) => s.localMods);
  const animations = useApp((s) => s.settings.animations);
  const enabledCount = profile.loadOrder.filter(
    (id) => localMods[id] && isEnabledIn(profile, id),
  ).length;
  const conflictCount = detectConflicts(profile).length;
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const bookRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prepareTurn = useBookTurn(bookRef, paperRef, location.pathname, animations);

  useLayoutEffect(() => {
    document.documentElement.dataset.grimoire = 'true';
    return () => {
      delete document.documentElement.dataset.grimoire;
    };
  }, []);

  useEffect(() => attachSmoothWheel(document), []);
  useEffect(() => trackMainWindow(), []);

  // Keep router history, the page title and the reader's scroll position together.
  useEffect(() => {
    document.title = `${chapter.label} · Ravenswatch Grimoire`;
  }, [chapter.label]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the scroll on each route, including detail pages.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  function turn(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, index: number) {
    const destination = chapters[index];
    if (
      !destination ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (location.pathname === destination.to) return;
    prepareTurn(index > current, event.detail !== 0);
    void navigate({ to: destination.to }).then(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
  }

  function toggleBookmark() {
    const saved = bookmarks.includes(chapter.to);
    const next = saved
      ? bookmarks.filter((path) => path !== chapter.to)
      : [...bookmarks, chapter.to];
    setBookmarks(next);
    try {
      localStorage.setItem('rsmm.grimoire.bookmarks.v1', JSON.stringify(next));
    } catch {
      /* Optional preference. */
    }
    toast.push(saved ? 'Bookmark removed.' : `${chapter.label} bookmarked.`, 'success');
  }

  return (
    <div className="grimoire-room" data-native={inTauri() || undefined}>
      <a href="#grimoire-content" className="grimoire-skip">
        Skip to page content
      </a>
      <div className="grimoire-window-drag" data-tauri-drag-region />
      {windowControls}
      <div className="grimoire-book" ref={bookRef}>
        <div className="grimoire-leather" aria-hidden="true" />
        <div className="grimoire-page-block" aria-hidden="true" />
        <div className="grimoire-facing" aria-hidden="true" />
        <nav className="grimoire-tabs" aria-label="Chapters">
          {chapters.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={index === current ? 'page' : undefined}
              onClick={(event) => turn(event, index)}
            >
              <span className="grimoire-tab-number" aria-hidden="true">
                {item.numeral}
              </span>
              <span>{item.label}</span>
              {bookmarks.includes(item.to) ? (
                <span className="grimoire-tab-bookmark" aria-label="Bookmarked">
                  ·
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <main className="grimoire-paper" ref={paperRef}>
          <div className="grimoire-binding" aria-hidden="true" />
          <div className="grimoire-scroll rsmm-main" ref={scrollRef}>
            {isChapterCover ? (
              <>
                <header className="grimoire-chapter-heading">
                  <h1 ref={headingRef} tabIndex={-1}>
                    {chapter.label}
                  </h1>
                </header>
                <div className="grimoire-rule" aria-hidden="true">
                  <span>❦</span>
                </div>
              </>
            ) : null}
            {location.pathname === '/settings' ? (
              <div className="grimoire-settings-tools">
                <AccountStrip />
              </div>
            ) : null}
            <UpdaterBanner />
            <ChannelStatusBanner />
            <div id="grimoire-content" className="grimoire-content" tabIndex={-1}>
              <Outlet />
            </div>
          </div>
          <footer className="grimoire-page-footer">
            <div className="grimoire-active">
              <span className="grimoire-active-dot" aria-hidden="true" />
              {enabledCount} active {enabledCount === 1 ? 'mod' : 'mods'}
              <span className="grimoire-profile-name"> · {profile.name}</span>
              {conflictCount > 0 ? (
                <Link to="/conflicts" className="grimoire-conflicts">
                  {' '}
                  · {conflictCount} conflicts
                </Link>
              ) : null}
            </div>
            <nav className="grimoire-pagination" aria-label="Turn the page">
              <button
                type="button"
                disabled={current === 0}
                aria-label="Previous chapter"
                onClick={(event) => turn(event, current - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span aria-label={`Chapter ${current + 1} of 3`}>{chapter.numeral}</span>
              <button
                type="button"
                disabled={current === chapters.length - 1}
                aria-label="Next chapter"
                onClick={(event) => turn(event, current + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
            <div className="grimoire-launch">{launch}</div>
          </footer>
        </main>
        <button
          type="button"
          className="grimoire-ribbon"
          aria-label={`${bookmarks.includes(chapter.to) ? 'Remove bookmark from' : 'Bookmark'} ${chapter.label}`}
          aria-pressed={bookmarks.includes(chapter.to)}
          onClick={toggleBookmark}
        >
          <Bookmark
            size={19}
            aria-hidden="true"
            fill={bookmarks.includes(chapter.to) ? 'currentColor' : 'none'}
          />
        </button>
      </div>
      <div className="grimoire-colophon">
        <span>
          Grimoire <i>×</i> Ravenswatch <span className="grimoire-study">/ Interface study</span>
        </span>
        <button type="button" onClick={onUseClassic}>
          Original interface <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}
