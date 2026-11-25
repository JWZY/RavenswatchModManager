# Dialog behavior PR evidence

Base: fafec67d3fb7a0e1fb338d92e90a07fd2dabcfac
Proposed change: 9c7d18cae4d50bf59ddd46d3651d8893b10f09b1
Captured 25 November 2026 in Chromium at 1440 × 1000; mobile web at 390 × 844.
Before captures use the exact base UI source files. After captures use the proposed source.

- Desktop: existing Library preview with fictional mods. Open Uninstall Raven’s Toolkit by keyboard, then press Tab twice. Before: focus reaches Search in the sidebar. After: focus stays on Cancel. No uninstall was performed.
- Web: the Damage Meter public listing, Report modal. Focus Submit report, then press Tab once. Before: focus escapes to the background Sign in link. After: focus wraps to Close. Mobile captures show the same open form at a narrow viewport. No report was submitted.
- Web session/reviews responses were stubbed locally to signed-out / no reviews for comparable captures. Next development indicators were hidden. Finite animations were fast-forwarded for settled screenshots.

Keep this branch: the PR embeds images by this immutable evidence commit.
