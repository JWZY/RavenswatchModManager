import { type RefObject, useLayoutEffect, useRef } from 'react';

interface PageFlip {
  flipTo: (page: number, corner: 'bottom') => Promise<unknown>;
  destroy: () => void;
}

declare global {
  interface Window {
    OpenPageFlip?: {
      createBook: (
        element: HTMLElement,
        options: {
          pages: HTMLElement[];
          width: number;
          height: number;
          size: 'fixed';
          layout: 'single';
          binding: 'right';
          startPage: number;
          autoSize: boolean;
          cover: boolean;
          flipDuration: number;
          shadows: boolean;
          shadowOpacity: number;
          click: 'off';
          drag: boolean;
          swipe: boolean;
          hover: boolean;
        },
      ) => PageFlip;
    };
  }
}

/** Inert DOM copies preserve the real page's ink without mounting a second app. */
function copyPaper(paper: HTMLElement): HTMLElement {
  const copy = paper.cloneNode(true) as HTMLElement;
  copy.inert = true;
  copy.setAttribute('aria-hidden', 'true');
  copy.removeAttribute('id');
  for (const element of copy.querySelectorAll('[id]')) element.removeAttribute('id');
  for (const element of copy.querySelectorAll('[aria-labelledby], [aria-controls], [tabindex]')) {
    element.removeAttribute('aria-labelledby');
    element.removeAttribute('aria-controls');
    element.removeAttribute('tabindex');
  }
  const scroll = copy.querySelector('.grimoire-scroll');
  if (scroll) scroll.scrollTop = paper.querySelector('.grimoire-scroll')?.scrollTop ?? 0;
  return copy;
}

export function useBookTurn(
  bookRef: RefObject<HTMLDivElement | null>,
  paperRef: RefObject<HTMLElement | null>,
  pathname: string,
  animations: boolean,
): (forward: boolean, pointer: boolean) => void {
  const pending = useRef<{ paper: HTMLElement; scrollTop: number; forward: boolean } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new route is the handoff from the outgoing page to the live incoming page.
  useLayoutEffect(() => {
    cleanup.current?.();
    const previous = pending.current;
    pending.current = null;
    const book = bookRef.current;
    const paper = paperRef.current;
    const library = window.OpenPageFlip;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (
      !previous ||
      !book ||
      !paper ||
      !library ||
      !animations ||
      motion.matches ||
      document.hidden
    )
      return;

    const { width, height } = paper.getBoundingClientRect();
    const stage = document.createElement('div');
    stage.className = 'grimoire-turn-stage';
    stage.inert = true;
    stage.setAttribute('aria-hidden', 'true');
    Object.assign(stage.style, { width: `${width}px`, height: `${height}px` });
    // Cover the live route with the old sheet while React commits the new outlet.
    stage.append(previous.paper);
    book.append(stage);
    const oldScroll = previous.paper.querySelector('.grimoire-scroll');
    if (oldScroll) oldScroll.scrollTop = previous.scrollTop;
    let engine: PageFlip | undefined;
    let frame = 0;
    let disposed = false;
    let timeout = 0;
    const onVisibility = () => {
      if (document.hidden) finish();
    };
    function finish() {
      if (disposed) return;
      disposed = true;
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', finish);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', finish);
      engine?.destroy();
      stage.remove();
    }
    cleanup.current = finish;
    window.addEventListener('resize', finish);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', finish);
    // Never leave a visual overlay behind if a renderer promise is interrupted.
    timeout = window.setTimeout(finish, 1500);
    function startTurn() {
      if (disposed || !paper || !library || !previous) return;
      const arriving = copyPaper(paper);
      // The renderer sets display:block on its leaves. Keep our flex-based paper
      // inside a leaf so the copied scroll area and footer retain their layout.
      const sheets = previous.forward ? [arriving, previous.paper] : [previous.paper, arriving];
      const pages = sheets.map((sheet) => {
        const leaf = document.createElement('div');
        leaf.dataset.density = 'soft';
        leaf.append(sheet);
        return leaf;
      });
      stage.replaceChildren(...pages);
      try {
        engine = library.createBook(stage, {
          pages,
          width,
          height,
          size: 'fixed',
          layout: 'single',
          binding: 'right',
          startPage: previous.forward ? 1 : 0,
          autoSize: false,
          cover: false,
          flipDuration: 500,
          shadows: true,
          shadowOpacity: 0.32,
          click: 'off',
          drag: false,
          swipe: false,
          hover: false,
        });
        if (oldScroll) oldScroll.scrollTop = previous.scrollTop;
        void engine.flipTo(previous.forward ? 0 : 1, 'bottom').then(finish, finish);
      } catch {
        finish();
      }
    }
    // Router location updates can precede the outlet's commit. Take the incoming
    // copy after two paints rather than pairing a new heading with old content.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(startTurn);
    });
    return finish;
  }, [pathname, animations, bookRef, paperRef]);

  return (forward, pointer) => {
    cleanup.current?.();
    pending.current = null;
    if (!pointer || !animations || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const paper = paperRef.current;
    if (paper)
      pending.current = {
        paper: copyPaper(paper),
        scrollTop: paper.querySelector('.grimoire-scroll')?.scrollTop ?? 0,
        forward,
      };
  };
}
