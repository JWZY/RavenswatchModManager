# Shared token PR captures

Before: a08d35f1624ee3bc21fd428e836e6aa8bd519745
After: 23d5410059789830d63ec137a3e8d95a46de8f9e
Captured 25 November 2026 in Chromium. Web/desktop 1440x1000; mobile 390x844.

Real app routes: web /auth/signin, desktop /signin?preview=library.
Web uses a local API fixture with two social providers and a 401 invalid-email-or-password response; no production authentication request was sent. Desktop uses the existing Library preview.

Desktop screenshots are byte-identical, confirming the foundation extraction preserves this screen. Focus captures show the same keyboard-focused link. This evidence branch is separate from the implementation PR.
