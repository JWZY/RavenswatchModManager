/**
 * Routes that may load the AdSense script: reading pages only. Everything
 * else (download, editors, auth, account, publish, admin, shared logs,
 * profiles) gets no ads, and a route added later stays ad-free until it is
 * listed here.
 *
 * Auto Ads keeps running after a client-side navigation away from one of
 * these pages, so the URL exclusions set in AdSense's Auto Ads settings are
 * the second half of this gate.
 */
const EXACT = new Set(['/', '/guides', '/registry', '/c', '/modding']);
const DETAIL = /^\/(guides|registry|c)\/[^/]+$/;
const FORMS = new Set(['/guides/new', '/c/new']);

export function adsAllowed(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (EXACT.has(path)) return true;
  return DETAIL.test(path) && !FORMS.has(path);
}
