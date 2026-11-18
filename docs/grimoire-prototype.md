# Grimoire interface prototype

Branch: `codex/grimoire-prototype`, based on `main` at `edbc7640`.

Run `pnpm --filter desktop dev:vite --host 127.0.0.1`, then open
http://127.0.0.1:1420/browse. The book is the default interface on this branch.
Use **Original interface** in the bottom margin to compare with the existing
manager; **Open the grimoire** brings the book back. This choice persists locally.

## What is connected

The book wraps the existing React router outlet. Browse uses the live registry,
including search, filters, collections, card/list views and full mod details.
Library, profile selection, settings, account navigation, command search and the
launch menu are the manager's existing components and state. The shell adds no
fixture catalogue or simulated install state.

Two prototype-specific adaptations make the browser preview usable:

- An empty Library stays on its chapter instead of redirecting to Browse.
- Registry detail fetching is enabled in the book's browser preview as well as
  Tauri. The original interface retains its existing behavior.

Installing, configuring installed mods and launching the game still use the
existing desktop/CLI integration. These operations were not exercised against a
game installation. The browser's empty Library accurately reflects the absence
of a desktop mod scan. The new shell's editorial labels are English; the embedded
manager retains its existing translations and appearance preferences.

## Source and integration

Visual materials come from the supplied local
`shopify-playground/grimoire` checkout: parchment WebPs, room grain, botanical SVGs,
Cinzel, IM Fell English and Cormorant Garamond. They are copied into
`apps/desktop/public/grimoire`, so this branch has no runtime dependency on that
checkout or a font CDN. The fonts' SIL Open Font Licenses are included.

OpenPageFlip 0.7.0 and its MIT license are retained in `public/grimoire/vendor`.
Chapter turns use inert HTML copies, not screenshots or a second mounted React
tree. The live route stays mounted beneath the fold. A leaf wrapper preserves the
flex layout of the page, and the incoming copy waits two frames for the router's
outlet to commit. Keyboard activation and reduced motion skip the fold. Rapid
navigation cancels the previous turn; resize, hidden tabs, unmounting and a timeout
all remove the temporary layers. If the renderer is unavailable, navigation works
without animation.

The shell, scoped parchment tokens and page-turn adapter live in
`apps/desktop/src/components/grimoire`. The theme attribute is applied to the HTML
element so existing portalled menus and dialogs inherit the same colours. It is
removed when returning to the original interface. Bookmarks and the shell choice
use separate, versioned local storage keys.

## Verification

- Desktop TypeScript check and production Vite build.
- Existing desktop Vitest suite: 38 files, 428 tests.
- Browser checks at 1440 × 1000 and 390 × 844: live catalogue search, filters,
  full mod details, chapter navigation, profile/account menus, command search,
  bookmarks across reloads and switching between interfaces.
- Page-turn checks: correct incoming/outgoing content, flex layout retained,
  rapid navigation, resize interruption, reduced motion, keyboard activation,
  zero leftover stages and zero duplicate DOM IDs after cleanup.

Local screenshots are in `.artifacts/grimoire-prototype/` (ignored by Git).
`before-browse.png` was captured from the unchanged base UI; `after-browse.png`
uses the same route, live catalogue and viewport. No PR was opened. Any future UX
PR must upload and embed the required before/after images at the top of its
description, as specified by `AGENTS.md`.
