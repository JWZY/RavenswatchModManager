// Dev-only entry: production components, deterministic local data, no native actions.
import '@fontsource-variable/alegreya/wght.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@rsmm/ui/styles.css';
import '@rsmm/ui/registry.css';
import { Dialog, RegistryFilterDialog } from '@rsmm/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportModal } from '../../www/src/app/components/report-modal';
import { AiDisclosureDialog } from '../src/components/ai-disclosure';
import { LaunchOptionsDialog } from '../src/components/launch-options-dialog';
import { ScreenshotLightbox } from '../src/components/screenshot-lightbox';
import { DialogProvider, useDialog } from '../src/components/toast';

function Fixtures() {
  const dialog = useDialog();
  const [result, setResult] = useState('untouched');
  const [parent, setParent] = useState(false);
  const [child, setChild] = useState(false);
  const [filters, setFilters] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [launch, setLaunch] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <main style={{ padding: 32, minHeight: '200vh' }}>
      <h1>Dialog regression fixtures</h1>
      <button
        type="button"
        onClick={() =>
          void dialog
            .confirm({
              title: 'Delete sample?',
              body: 'This cannot be undone.',
              destructive: true,
              confirmLabel: 'Delete',
            })
            .then((v) => setResult(String(v)))
        }
      >
        Delete sample
      </button>
      <button
        type="button"
        onClick={() =>
          void dialog
            .prompt({ title: 'Rename sample', initialValue: 'Raven', label: 'Name' })
            .then((v) => setResult(JSON.stringify(v)))
        }
      >
        Rename sample
      </button>
      <button
        type="button"
        onClick={() =>
          void dialog
            .prompt({ title: 'Edit notes', multiline: true, label: 'Notes' })
            .then((v) => setResult(JSON.stringify(v)))
        }
      >
        Edit notes
      </button>
      <button
        type="button"
        onClick={() =>
          void dialog
            .confirm({
              title: 'Long confirmation',
              body: '模组设置 — Long translated content. '.repeat(150),
            })
            .then((v) => setResult(String(v)))
        }
      >
        Long confirmation
      </button>
      <button type="button" onClick={() => setParent(true)}>
        Open parent
      </button>
      <button type="button" onClick={() => setFilters(true)}>
        Open filters
      </button>
      <button type="button" onClick={() => setDisclosure(true)}>
        Open disclosure
      </button>
      <button type="button" onClick={() => setLaunch(true)}>
        Open launch options
      </button>
      <button type="button" onClick={() => setLightbox(true)}>
        Open image
      </button>
      <ReportModal slug="dialog-test" />
      <output aria-label="Result">{result}</output>
      {parent && (
        <Dialog
          overlay
          aria-label="Parent"
          onDismiss={() => setParent(false)}
          className="bg-pitch/80 p-4"
        >
          <div className="grimoire-card p-5">
            <button type="button" onClick={() => setChild(true)}>
              Open child
            </button>
            <button type="button" onClick={() => setParent(false)}>
              Close parent
            </button>
          </div>
        </Dialog>
      )}
      {child && (
        <Dialog
          overlay
          aria-label="Child"
          onDismiss={() => setChild(false)}
          initialFocusRef={cancelRef}
          className="bg-pitch/80 p-4"
        >
          <div className="grimoire-card p-5">
            <button type="button" ref={cancelRef} onClick={() => setChild(false)}>
              Close child
            </button>
            <button type="button" onClick={() => setParent(false)}>
              Unmount parent first
            </button>
          </div>
        </Dialog>
      )}
      {filters && (
        <RegistryFilterDialog
          value={{ category: '', tags: [], minRating: 0, toggles: {} }}
          categories={[]}
          tags={[]}
          ratings={[]}
          toggles={[]}
          onApply={() => setFilters(false)}
          onClose={() => setFilters(false)}
          onClear={() => ({ category: '', tags: [], minRating: 0, toggles: {} })}
        />
      )}
      {disclosure && <AiDisclosureDialog onAcknowledged={() => setDisclosure(false)} />}
      {launch && (
        <LaunchOptionsDialog onCancel={() => setLaunch(false)} onLaunch={() => setLaunch(false)} />
      )}
      {lightbox && (
        <ScreenshotLightbox
          idx={0}
          shots={[{ url: '/logo.png', caption: 'Sample image' }]}
          onPrev={() => {}}
          onNext={() => {}}
          onClose={() => setLightbox(false)}
        />
      )}
    </main>
  );
}

const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
const root = document.getElementById('root');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <DialogProvider>
        <Fixtures />
      </DialogProvider>
    </QueryClientProvider>
  </StrictMode>,
);
