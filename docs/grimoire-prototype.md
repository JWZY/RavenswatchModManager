# Grimoire interface prototype

Branch: `codex/grimoire-prototype`, based on `main` at `edbc7640`.

Run `pnpm --filter desktop dev:vite --host 127.0.0.1`, then open
http://127.0.0.1:1420/browse. The book is the default interface on this branch.
Use **Original interface** in the bottom margin to compare with the existing
manager; **Open the grimoire** brings the book back. This choice persists locally.

## What is connected

The book wraps the existing React router outlet. Browse uses the live registry,
including search, filters, collections, card/list views and full mod details.
Library, settings, account navigation, command search and the
launch menu are the manager's existing components and state. Each chapter starts
with its plain navigation label (Browse, Library or Settings), sized to match
the mod-card titles, and a single ornamental rule. Chapter tabs sit near the top
of the book: the active tab shares the page edge's colour, while inactive tabs
are darker beige. The wider bookmark ribbon holds the existing Launch Modded
button, launch icon and options menu. A separate text tab near the bottom left
opens the sign-in/account menu. Settings has no account row or profile selector.
The page has no bottom footer: its content scrolls through the full sheet, fading
into the actual parchment at the top and bottom through a gradient mask.
Command search remains available with
Ctrl/Cmd+K. The shell adds no
fixture catalogue or simulated install state.

Two prototype-specific adaptations make the browser preview usable:

- An empty Library stays on its chapter instead of redirecting to Browse.
  Its empty page uses the original moth engraving directly on the parchment,
  a compact heading and an underlined ink inscription to browse for the first mod.
  The lettering blends with the parchment through a faint pigment-grain mask;
  the browse link retains a 44px hit area and a visible keyboard focus outline.
- Registry detail fetching is enabled in the book's browser preview as well as
  Tauri. The original interface retains its existing behavior.

Installing, configuring installed mods and launching the game still use the
existing desktop/CLI integration. These operations were not exercised against a
game installation. The browser's empty Library accurately reflects the absence
of a desktop mod scan. The new shell's editorial labels are English; the embedded
manager retains its existing translations and appearance preferences.

## Source and integration

Visual materials come from the supplied local
`shopify-playground/grimoire` checkout: parchment WebPs, room grain, moth engraving,
Cinzel, IM Fell English and Cormorant Garamond. They are copied into
`apps/desktop/public/grimoire`, so this branch has no runtime dependency on that
checkout or a font CDN. The fonts' SIL Open Font Licenses are included.

Catalogue artwork, collection covers and gallery thumbnails use a live SVG
filter that extracts sepia outlines and a light ink wash, with a faint pigment
grain. This approximates an engraving from each original image; it does not
redraw illustrations or change uploaded files. Full-size gallery images remain
available in their original form. The filter is scoped to the book interface.

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
removed when returning to the original interface. The shell choice uses a
versioned local storage key. The ribbon is the game launcher rather than a page
bookmark.

## Verification

- Desktop TypeScript check and production Vite build.
- Existing desktop Vitest suite: 38 files, 428 tests.
- Browser checks at 1440 × 1000 and 390 × 844: live catalogue search, filters,
  full mod details, chapter navigation, account menus, command search,
  and switching between interfaces.
- Account-tab checks while signed out: real sign-in navigation, Escape returning
  focus to the tab, and menu placement at 320 × 568. No credentials submitted.
- Launch ribbon: the existing launch icon and action, options menu opening below
  the ribbon, keyboard focus and Escape dismissal. The game was not launched.
- Empty Library checked at 1440 × 1000, 390 × 844 and 320 × 740: original moth
  artwork loads, headings remain 23px, no horizontal overflow, and Browse mods
  opens the live catalogue.
- Full-page scroll and engraved artwork checked at 1510 × 825 and 390 × 844:
  both edge fades, the last card fully visible at the bottom, live gallery
  thumbnails, and opening an unfiltered full-size image. Original interface
  retains its colours and removes the book's filter definitions.
- Page-turn checks: correct incoming/outgoing content, flex layout retained,
  rapid navigation, resize interruption, reduced motion, keyboard activation,
  zero leftover stages and zero duplicate DOM IDs after cleanup.

Local screenshots are in `.artifacts/grimoire-prototype/` (ignored by Git).
`before-browse.png` was captured from the unchanged base UI; `after-browse.png`
uses the same route, live catalogue and viewport. The simplified header is shown
in `cleanup-before.png` and `cleanup-after.png` at 1510 × 825. No PR was opened. Any future UX
PR must upload and embed the required before/after images at the top of its
description, as specified by `AGENTS.md`.
