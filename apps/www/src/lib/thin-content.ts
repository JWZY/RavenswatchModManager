/**
 * The bar a mod or collection page clears to be indexed and listed in the
 * sitemap: an author-written description of at least this many characters.
 * The summary is a one-line card blurb and does not count toward it.
 */
export const MIN_DESCRIPTION_CHARS = 200;

export function descriptionLength(description: string | null | undefined): number {
  return description?.trim().length ?? 0;
}

export function isThin(length: number | null | undefined): boolean {
  return (length ?? 0) < MIN_DESCRIPTION_CHARS;
}
