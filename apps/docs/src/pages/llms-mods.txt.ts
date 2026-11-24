import { getCollection } from 'astro:content';
// /llms-mods.txt — the mod-AUTHORING corpus, as one plain-text file.
//
// `/llms-full.txt` is everything, and everything is the problem: two thirds of
// this site is reverse-engineering notes on Ravenswatch's engine, written for
// people working on RSMM itself. An assistant asked to build a mod that
// ingests the full corpus spends most of its context on vtable layouts and
// crash triage, and the authoring rules it actually needs are diluted. This
// route is the subset an author needs and nothing else.
//
// Hand-rolled (no plugin) to work on the pinned Starlight 0.30, and it shares
// its shape with llms-full.txt on purpose.
import type { APIRoute } from 'astro';

const pageUrl = (base: string, id: string) => (id === 'index' ? `${base}/` : `${base}/${id}/`);

/** Section prefixes an author needs. Everything else is excluded. */
const INCLUDE_PREFIXES = ['getting-started/', 'concepts/', 'guides/', 'reference/'];

/** Individually included pages from otherwise-excluded sections. */
const INCLUDE_PAGES = new Set(['index', 'architecture/overview']);

/**
 * Individually excluded pages from otherwise-included sections: engine-facing
 * reference material that costs an author context and teaches them nothing
 * they may act on (mod Lua is forbidden from touching engine symbols at all —
 * `rsmm lint` fails it).
 */
const EXCLUDE_PAGES = new Set([
  'reference/symbols',
  // A Chinese copy-paste prompt that restates pages already in this corpus.
  'guides/ai-assistant-zh',
]);

/** Leads the corpus: the rules the other pages are read under. */
const FIRST_PAGE = 'guides/agent-instructions';

const wanted = (id: string) =>
  !EXCLUDE_PAGES.has(id) &&
  (INCLUDE_PAGES.has(id) || INCLUDE_PREFIXES.some((p) => id.startsWith(p)));

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://docs.rsmm.me').replace(/\/$/, '');
  const docs = (await getCollection('docs'))
    .filter((e) => e.id !== '404' && wanted(e.id))
    .sort(
      (a, b) =>
        Number(b.id === FIRST_PAGE) - Number(a.id === FIRST_PAGE) || a.id.localeCompare(b.id),
    );

  const parts = [
    '# Ravenswatch Mod Manager — Mod authoring',
    '',
    'Everything needed to build a Ravenswatch mod with the Ravenswatch Mod',
    'Manager (RSMM), as one plain-text file. Ravenswatch has no official mod',
    'support: RSMM is the toolchain, and the format below is the only one the',
    'game will load.',
    '',
    'The first page below, "Instructions for AI agents building mods", has the',
    'rules. Read it before the rest. Where another page disagrees with it, follow',
    'it. The rule that matters most: never push to RSMM and never open a pull',
    'request against it. Changes to RSMM go through an issue.',
    '',
    `Reverse-engineering notes on the game engine are NOT included here; they are in ${base}/llms-full.txt.`,
    `Page index: ${base}/llms.txt · Source: ${base}`,
    '',
  ];
  for (const entry of docs) {
    parts.push(
      '\n---\n',
      `# ${entry.data.title}`,
      entry.data.description ? `\n> ${entry.data.description}\n` : '',
      `Source: ${pageUrl(base, entry.id)}\n`,
      entry.body ?? '',
    );
  }

  return new Response(`${parts.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
