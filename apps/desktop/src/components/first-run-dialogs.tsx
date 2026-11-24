import { useState } from 'react';
import { inTauri } from '../lib/platform';
import { AiDisclosureDialog } from './ai-disclosure';
import { CliUpdateDialog } from './cli-update-dialog';

/** The disclosure gets priority over the actionable CLI update prompt. */
export function FirstRunDialogs() {
  const preview =
    import.meta.env.DEV &&
    !inTauri() &&
    new URLSearchParams(window.location.search).get('preview') === 'cli-update';
  const [disclosureDone, setDisclosureDone] = useState(preview);
  return (
    <>
      {preview ? null : <AiDisclosureDialog onAcknowledged={() => setDisclosureDone(true)} />}
      <CliUpdateDialog enabled={disclosureDone} preview={preview} />
    </>
  );
}
