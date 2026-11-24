# Official provider logos

Before: `main` at `0eaf3c9b`.
After: the shared official provider logos in this PR.

All before/after pairs use Chromium at 1280 × 1000, English, the default
appearance, and the same signed-out state. The screenshots are cropped to
the affected forms, settings header, or website footer; each pair uses the
same crop. The website footer is scrolled into view before capture.

- `desktop-signin-*`: `/signin?preview=library`.
- `desktop-signup-*`: the same route after clicking **Create one.**
- `desktop-settings-*`: `/settings?preview=library&tab=appearance`.
- `web-signin-*`: `/auth/signin`.
- `web-signup-*`: `/auth/signup`.
- `web-footer-*`: the shared website footer on `/auth/signup`.

A temporary local API returns all three providers as available and a null
session. It contains no credentials and is not shipped. The desktop uses
its existing browser preview with sample mods. No OAuth requests or live
account changes were made. These screenshots verify rendering, not a native
Tauri OAuth handoff. The website sign-in layout was also checked at 390 × 844.

The Google artwork comes from the official sign-in HTML configurator,
Discord from its official Clyde symbol, and GitHub from Primer Octicons.
Sources and license attribution are recorded in `THIRD_PARTY_NOTICES.md`.
