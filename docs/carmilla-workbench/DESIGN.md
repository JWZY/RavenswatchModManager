# Carmilla kit study — page design

A standalone reading and inspection surface for a working session, separate from the desktop application's UI. The primary task is to distinguish facts, observed edits, and hypotheses before choosing balance changes.

Warm paper (#f6f3eb), dark ink (#282823), muted text (#666358), burgundy (#802f42), and green (#43614c). Newsreader 500 supplies the large headings; locally hosted DM Sans 400/500/600/700 carries body and interface text. Body text is 15px, supporting text at least 12px. Reading columns are constrained; rules separate findings rather than enclosing everything in cards.

Desktop has a fixed section navigation. Mobile uses a scrollable navigation row, stacked discussion columns, and compact talent summaries with complete details still available. Disclosure controls use native details/summary; filters and timeline inputs are native form controls. Focus, skip navigation, live result messages, empty/error states, reduced motion are supported.

Page data lives in research.json. Any future edit should preserve the difference between the official game reference and the modified package snapshot, and keep source evidence next to claims. Do not turn speculative synergies into confirmed interactions through copy changes.

Comparison additions use the same type, paper, and rules. Base kits align by input, then hero; narrow layouts stack heroes within each input. Resource roles use green for generation and ochre for spending. User-selected rework names use accessible red (#b32623), with a text label so color is not the only signal. Comparison data lives separately in base-kits.json and talent-atlas.json.

The main talent comparison is now a plain four-column table: section, Carmilla, Scarlet, Aladdin. It prioritizes visible names over filters and detailed disclosures. Talents repeat in each relevant section. Small notes are reserved for distinctions such as damage scaling or wish variants. On narrow screens, the table scrolls horizontally with the section column fixed in view.
