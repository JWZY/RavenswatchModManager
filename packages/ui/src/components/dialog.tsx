'use client';

import { type ComponentPropsWithoutRef, type RefObject, useLayoutEffect, useRef } from 'react';
import { cn } from '../lib/cn';

const scrollLocks = new WeakMap<Document, { count: number; restore: () => void }>();

function lockScroll(document: Document) {
  let lock = scrollLocks.get(document);
  if (!lock) {
    const styles = [document.documentElement.style, document.body.style];
    const previous = styles.map((style) => ({
      style,
      value: style.getPropertyValue('overflow'),
      priority: style.getPropertyPriority('overflow'),
    }));
    for (const style of styles) style.setProperty('overflow', 'hidden');
    lock = {
      count: 0,
      restore: () => {
        for (const { style, value, priority } of previous) {
          if (value) style.setProperty('overflow', value, priority);
          else style.removeProperty('overflow');
        }
      },
    };
    scrollLocks.set(document, lock);
  }
  lock.count++;
  return () => {
    if (--lock.count === 0) {
      lock.restore();
      scrollLocks.delete(document);
    }
  };
}

type DialogProps = Omit<ComponentPropsWithoutRef<'dialog'>, 'open' | 'onCancel' | 'onClose'> & {
  open?: boolean;
  /** Omit for a notice that must be answered. Escape never bypasses this policy. */
  onDismiss?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Full-window shell for hosts that draw their own backdrop and card. */
  overlay?: boolean;
};

/** Native modality owns inertness and stacking; hosts own the content and skin. */
export function Dialog({
  open = true,
  onDismiss,
  initialFocusRef,
  overlay = false,
  className,
  onKeyDown,
  children,
  ...props
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const document = node.ownerDocument;
    const trigger = document.activeElement;
    node.showModal();
    const unlock = lockScroll(document);
    initialFocusRef?.current?.focus({ preventScroll: true });
    return () => {
      const ownedFocus = node.contains(document.activeElement);
      node.close();
      unlock();
      // Do not steal focus from a newer dialog when an older one unmounts.
      if (ownedFocus && trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [open, initialFocusRef]);

  return (
    <dialog
      {...props}
      ref={ref}
      className={cn('rsmm-dialog', overlay && 'rsmm-dialog--overlay', className)}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dismiss.current?.();
      }}
      onClose={(event) => {
        // close() queues an event. Ignore a cleanup event after StrictMode reopens it.
        if (!event.currentTarget.open) dismiss.current?.();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === 'Escape') event.stopPropagation();
        if (event.defaultPrevented || event.key !== 'Tab') return;
        // Native modality excludes background controls. Wrap the endpoints too,
        // so Tab stays in the task instead of visiting browser chrome.
        const stops = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, iframe, [tabindex], [contenteditable="true"]',
          ),
        ).filter(
          (node) =>
            node.tabIndex >= 0 &&
            !node.matches(':disabled') &&
            !node.closest('[inert]') &&
            node.getClientRects().length > 0 &&
            getComputedStyle(node).visibility !== 'hidden',
        );
        const first = stops[0];
        const last = stops.at(-1);
        const active = event.currentTarget.ownerDocument.activeElement;
        if (!first || !last) {
          event.preventDefault();
        } else if (event.shiftKey && (active === first || !stops.includes(active as HTMLElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </dialog>
  );
}
