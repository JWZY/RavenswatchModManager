import { useChangelog } from '../lib/changelog-state';
import { useT } from '../lib/i18n-react';
import { MonoTag } from './chrome';

/**
 * The About content, as sections within Settings.
 *
 * Rendered inside Settings' "About" category — one place for "how is this thing
 * configured, and what is it". `/about` is kept as a redirect so an older link
 * still lands somewhere sensible.
 */
export function AboutPanels() {
  const t = useT();
  const version = useChangelog((s) => s.current);
  const buttonClass = 'btn-grim inline-flex items-center justify-center px-3 py-1.5 text-sm';

  return (
    <div className="settings-group">
      <section className="settings-section flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h3 className="settings-section-title text-parchment">
              {t('AI assistance & reverse engineering')}
            </h3>
            <p className="font-serif-italic mt-1 text-ash">
              {t('Shown once on first launch, kept here for reference.')}
            </p>
          </div>
        </div>
        <p className="font-serif-italic leading-relaxed text-parchment/90">
          {t(
            'Ravenswatch ships no modding API, so every capability here was reverse-engineered from the shipped game with Ghidra, disassembly and pattern-mining tools, plus a great deal of in-game testing. An AI coding assistant (Claude) was one instrument in that toolchain, used for reading decompiler output, drafting analysis tooling and writing application code. It is not the author of the result.',
          )}
        </p>
        <p className="font-serif-italic leading-relaxed text-smoke">
          {t(
            'Nothing reaches your game on an unverified claim: engine addresses are resolved by byte-pattern scan against your own copy of the game and re-verified before the loader is planted, CI re-derives the generated loader and SDK artifacts and fails on drift, a capability is only marked confirmed once it has been proven in a real run, and the loader bundle is cryptographically signed. Every file RSMM replaces is backed up, and Restore returns the install to stock.',
          )}
        </p>
      </section>

      <section className="settings-section flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h4 className="settings-section-title text-parchment">{t('Credits')}</h4>
          <p className="text-smoke font-serif-italic">
            {t('Created by the RSMM community · Licensed under the project license')}
          </p>
          <p className="text-smoke font-serif-italic text-xs">{t('Logo by Arch')}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonoTag>v{version}</MonoTag>
          <a
            href="https://github.com/Ravenswatch-Modding/RavenswatchModManager/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer noopener"
            className={buttonClass}
          >
            {t('View license')}
          </a>
        </div>
      </section>
    </div>
  );
}
