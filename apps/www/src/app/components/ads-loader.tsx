'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { adsAllowed } from '../../lib/ads';

/**
 * Google AdSense loader (Auto Ads), mounted only on the routes `adsAllowed`
 * lists. Production only: Google rejects the script from localhost/preview.
 * Website only, never the desktop app.
 */
export function AdsLoader() {
  const pathname = usePathname();
  if (process.env.NODE_ENV !== 'production' || !adsAllowed(pathname)) return null;
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9139637424510522"
    />
  );
}
