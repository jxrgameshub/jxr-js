import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Command as CommandIcon,
  Copy,
  Gauge,
  Layers,
  LayoutTemplate,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CommandPalette } from '@/components/CommandPalette';
import type { Command } from '@/components/CommandPalette';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/Dialog';

/**
 * Faithful, dependency-free recreations of three presets from the
 * jxr-shaders-components reference ("Lotus Metal", "Ember Metal",
 * "Aurora Border"). The originals render through @paper-design/shaders-react
 * (WebGL); here the metallic surfaces and the pulsing aurora border are built
 * with pure CSS so the starter stays self-contained and behaves identically
 * under jxr dev and jxr build.
 *
 * The command palette (⌘K / Ctrl-K) is built on Radix UI primitives, which the
 * JXR import map resolves from esm.sh — no install required.
 *
 * Under `jxr dev` the palette also lists the official project templates, served
 * live from /__jxr/templates. Choosing one shows a permanent-choice confirmation
 * and then drops it into src/ (your current src/ is backed up to .jxr/ first).
 *
 * Palettes are copied verbatim from the reference source (shader-gallery.tsx):
 *   Lotus  — tint #a855f7, colors ["#5b21b6", "#a855f7", "#e879f9", "#f5f3ff", "#2e1065"]
 *   Aurora — tint #22d3ee, colors ["#164e63", "#06b6d4", "#67e8f9", "#f0fdfa", "#0f172a"]
 *   Ember  — tint #fb7185, colors ["#7f1d1d", "#f43f5e", "#fb923c", "#fef3c7", "#450a0a"]
 */

type CssVars = Record<string, string>;

const vars = (values: CssVars): CSSProperties => values as unknown as CSSProperties;

interface Preset {
  id: string;
  name: string;
  kind: 'LiquidMetal' | 'PulsingBorder';
  tint: string;
  vars: CssVars;
}

const PRESETS: Preset[] = [
  {
    id: 'lotus-metal',
    name: 'Lotus Metal',
    kind: 'LiquidMetal',
    tint: '#a855f7',
    vars: {
      '--metal-1': '#5b21b6',
      '--metal-2': '#a855f7',
      '--metal-3': '#e879f9',
      '--metal-4': '#2e1065',
      '--metal-hi': '#f5f3ff',
      '--metal-glow': 'rgba(168, 85, 247, 0.5)',
      '--aurora-1': '#5b21b6',
      '--aurora-2': '#a855f7',
      '--aurora-3': '#e879f9',
      '--aurora-4': '#f5f3ff',
      '--aurora-5': '#2e1065',
      '--aurora-glow': 'rgba(168, 85, 247, 0.2)',
    },
  },
  {
    id: 'ember-metal',
    name: 'Ember Metal',
    kind: 'LiquidMetal',
    tint: '#fb7185',
    vars: {
      '--metal-1': '#7f1d1d',
      '--metal-2': '#f43f5e',
      '--metal-3': '#fb923c',
      '--metal-4': '#450a0a',
      '--metal-hi': '#fef3c7',
      '--metal-glow': 'rgba(251, 113, 133, 0.5)',
      '--aurora-1': '#7f1d1d',
      '--aurora-2': '#f43f5e',
      '--aurora-3': '#fb923c',
      '--aurora-4': '#fef3c7',
      '--aurora-5': '#450a0a',
      '--aurora-glow': 'rgba(244, 63, 94, 0.2)',
    },
  },
  {
    id: 'aurora-border',
    name: 'Aurora Border',
    kind: 'PulsingBorder',
    tint: '#22d3ee',
    vars: {
      '--metal-1': '#164e63',
      '--metal-2': '#06b6d4',
      '--metal-3': '#67e8f9',
      '--metal-4': '#0f172a',
      '--metal-hi': '#f0fdfa',
      '--metal-glow': 'rgba(34, 211, 238, 0.5)',
      '--aurora-1': '#164e63',
      '--aurora-2': '#06b6d4',
      '--aurora-3': '#67e8f9',
      '--aurora-4': '#f0fdfa',
      '--aurora-5': '#0f172a',
      '--aurora-glow': 'rgba(34, 211, 238, 0.2)',
    },
  },
];

/** Metadata served by the dev server at /__jxr/templates. */
interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  tags: string[];
  accent: string;
  kind: string;
}

const CONFIRM_MESSAGE =
  'Are you sure you want to choose this template? This action is permanent and you will need to jxr init a fresh project if you decide to change templates later.';

type CatalogState = 'loading' | 'ready' | 'unavailable';

export default function App() {
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [status, setStatus] = useState('Tip: press ⌘K (or Ctrl-K) to open the command palette.');
  const [catalog, setCatalog] = useState<TemplateMeta[]>([]);
  const [catalogState, setCatalogState] = useState<CatalogState>('loading');
  const [pending, setPending] = useState<TemplateMeta | null>(null);
  const [applying, setApplying] = useState(false);
  const preset = PRESETS[active];

  // Load the official template catalog from the dev server (dev only).
  useEffect(() => {
    let cancelled = false;
    setCatalogState('loading');
    fetch('/__jxr/templates')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((res: { templates?: Array<{ meta: TemplateMeta }> }) => {
        if (cancelled) return;
        const list = (res.templates ?? []).map((bundle) => bundle.meta);
        setCatalog(list);
        setCatalogState('ready');
      })
      .catch(() => {
        if (!cancelled) setCatalogState('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectPreset = useCallback((index: number) => {
    setActive(index);
    setStatus('Template applied — ' + PRESETS[index].name);
  }, []);

  // Global ⌘K / Ctrl-K shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const copySnippet = useCallback(() => {
    const snippet =
      'import { Button } from "@/components/ui/Button";\n' +
      'import { CommandPalette } from "@/components/CommandPalette";\n' +
      '\n' +
      '// Radix primitives resolve through the JXR import map.\n';
    navigator.clipboard?.writeText(snippet);
    setStatus('Copied the Radix + palette import snippet to your clipboard.');
  }, []);

  const applyTemplate = useCallback(async (template: TemplateMeta) => {
    setApplying(true);
    setStatus('Applying template — ' + template.name + '…');
    try {
      const res = await fetch('/__jxr/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || 'Apply failed');
      setStatus('Applied ' + template.name + '. Reloading…');
      // The dev server also broadcasts an HMR reload; this is a defensive fallback.
      window.setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setStatus(
        'Could not apply template: ' + (err instanceof Error ? err.message : String(err))
      );
      setApplying(false);
      setPending(null);
    }
  }, []);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'open-palette',
        label: 'Open command palette',
        group: 'Features',
        hint: '⌘K',
        keywords: ['launcher', 'search', 'radix'],
        icon: <CommandIcon className="jxr-cmd-icon" />,
        onSelect: () => setOpen(true),
      },
      {
        id: 'cycle-preset',
        label: 'Cycle shader preset',
        group: 'Features',
        keywords: ['shader', 'metal', 'aurora'],
        icon: <Palette className="jxr-cmd-icon" />,
        onSelect: () => selectPreset((active + 1) % PRESETS.length),
      },
      {
        id: 'increment',
        label: 'Increment counter',
        group: 'Features',
        icon: <Plus className="jxr-cmd-icon" />,
        onSelect: () => {
          setCount((value) => value + 1);
          setStatus('Counter incremented.');
        },
      },
      {
        id: 'reset',
        label: 'Reset counter',
        group: 'Features',
        icon: <RotateCcw className="jxr-cmd-icon" />,
        onSelect: () => {
          setCount(0);
          setStatus('Counter reset to 0.');
        },
      },
      {
        id: 'reduce-motion',
        label: reduceMotion ? 'Enable animations' : 'Reduce motion',
        group: 'Features',
        keywords: ['a11y', 'animation', 'accessibility'],
        icon: <Waves className="jxr-cmd-icon" />,
        onSelect: () => {
          setReduceMotion((value) => !value);
          setStatus('Motion preference toggled.');
        },
      },
      ...PRESETS.map<Command>((item, index) => ({
        id: 'preset-' + item.id,
        label: item.name,
        group: 'Theme presets',
        hint: item.kind,
        accent: item.tint,
        keywords: ['theme', 'preset', 'shader', item.id],
        onSelect: () => selectPreset(index),
      })),
      ...catalog.map<Command>((item) => ({
        id: 'template-' + item.id,
        label: item.name,
        group: 'Templates',
        description: item.description,
        accent: item.accent,
        keywords: ['template', ...(item.tags ?? []), item.id],
        onSelect: () => setPending(item),
      })),
      {
        id: 'tool-importmap',
        label: 'Inspect shared import map',
        group: 'Tools',
        keywords: ['radix', 'esm.sh', 'modules'],
        icon: <Layers className="jxr-cmd-icon" />,
        onSelect: () =>
          setStatus('jxr dev and jxr build share one import map (React 19 + Radix via esm.sh).'),
      },
      {
        id: 'tool-copy',
        label: 'Copy Radix import snippet',
        group: 'Tools',
        keywords: ['clipboard', 'component'],
        icon: <Copy className="jxr-cmd-icon" />,
        onSelect: copySnippet,
      },
      {
        id: 'tool-bench',
        label: 'Show runtime tips',
        group: 'Tools',
        keywords: ['performance', 'hmr'],
        icon: <Gauge className="jxr-cmd-icon" />,
        onSelect: () => setStatus('Edit src/App.tsx and save — HMR reloads instantly.'),
      },
    ],
    [active, reduceMotion, selectPreset, copySnippet, catalog]
  );

  const catalogHint =
    catalogState === 'ready'
      ? catalog.length + ' project templates available — open the palette and pick “Templates”.'
      : catalogState === 'loading'
        ? 'Loading project templates from the dev server…'
        : 'Project templates appear here when running under jxr dev.';

  return (
    <div className={'jxr-app' + (reduceMotion ? ' jxr-reduce-motion' : '')} style={vars(preset.vars)}>
      <div className="jxr-shell">
        <div className="jxr-aurora">
          <section className="jxr-card">
            <header className="jxr-hero">
              <span className="jxr-mark" aria-hidden="true" />
              <div className="jxr-hero-body">
                <p className="jxr-eyebrow">JXR.js — Edge OS Runtime</p>
                <h1 className="jxr-title">Zero-build React.</h1>
                <p className="jxr-tagline">
                  Edit <code>src/App.tsx</code> and save — HMR is instant.
                </p>
              </div>
              <Button
                variant="ghost"
                className="jxr-palette-trigger"
                onClick={() => setOpen(true)}
                aria-label="Open command palette"
              >
                <CommandIcon className="jxr-cmd-icon" aria-hidden="true" />
                <span>Command</span>
                <kbd className="jxr-kbd">⌘K</kbd>
              </Button>
            </header>

            <div className="jxr-presets" role="tablist" aria-label="Shader presets">
              {PRESETS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  className="jxr-chip"
                  style={vars({ '--swatch': item.tint })}
                  onClick={() => selectPreset(index)}
                >
                  <span className="jxr-dot" aria-hidden="true" />
                  {item.name}
                </button>
              ))}
            </div>

            <div className="jxr-demo">
              <div className="jxr-panel">
                <p className="jxr-label">{preset.kind} / Metal</p>
                <div className="jxr-orb" aria-hidden="true" />
              </div>

              <div className="jxr-panel">
                <p className="jxr-label">Aurora Border</p>
                <div className="jxr-actions" style={{ marginTop: 0 }}>
                  <Button variant="primary" onClick={() => setCount((value) => value + 1)}>
                    Count<span className="jxr-count">{count}</span>
                  </Button>
                  <Button variant="ghost" onClick={() => setCount(0)}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="jxr-status" role="status" aria-live="polite">
              <Sparkles className="jxr-cmd-icon" aria-hidden="true" />
              <span>{status}</span>
            </div>

            <p className="jxr-hint">
              Preset <strong>{preset.name}</strong> · tint <code>{preset.tint}</code> · {catalogHint}
            </p>
          </section>
        </div>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} commands={commands} />

      <Dialog
        open={pending !== null}
        onOpenChange={(value) => {
          if (!value && !applying) setPending(null);
        }}
      >
        <DialogContent className="jxr-confirm">
          <DialogTitle className="jxr-confirm-title">
            Choose “{pending?.name}”?
          </DialogTitle>
          <DialogDescription className="jxr-confirm-text">{CONFIRM_MESSAGE}</DialogDescription>
          <p className="jxr-confirm-note">
            Your current <code>src/</code> is backed up to{' '}
            <code>.jxr/backup-&lt;timestamp&gt;/</code> first.
          </p>
          <div className="jxr-confirm-actions">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={applying}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pending) applyTemplate(pending);
              }}
              disabled={applying}
            >
              {applying ? 'Applying…' : 'Choose this template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
