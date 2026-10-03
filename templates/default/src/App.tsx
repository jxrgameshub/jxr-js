import { useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Faithful, dependency-free recreations of three presets from the
 * jxr-shaders-components reference ("Lotus Metal", "Ember Metal",
 * "Aurora Border"). The originals render through @paper-design/shaders-react
 * (WebGL); here the metallic surfaces and the pulsing aurora border are built
 * with pure CSS so the starter stays self-contained and behaves identically
 * under jxr dev and jxr build.
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

export default function App() {
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);
  const preset = PRESETS[active];

  return (
    <div className="jxr-app" style={vars(preset.vars)}>
      <div className="jxr-shell">
        <div className="jxr-aurora">
          <section className="jxr-card">
            <header className="jxr-hero">
              <span className="jxr-mark" aria-hidden="true" />
              <div>
                <p className="jxr-eyebrow">JXR.js — Edge OS Runtime</p>
                <h1 className="jxr-title">Zero-build React.</h1>
                <p className="jxr-tagline">
                  Edit <code>src/App.tsx</code> and save — HMR is instant.
                </p>
              </div>
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
                  onClick={() => setActive(index)}
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
                  <button
                    type="button"
                    className="jxr-btn jxr-btn-primary"
                    onClick={() => setCount((value) => value + 1)}
                  >
                    Count<span className="jxr-count">{count}</span>
                  </button>
                  <button
                    type="button"
                    className="jxr-btn jxr-btn-ghost"
                    onClick={() => setCount(0)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <p className="jxr-hint">
              Preset <strong>{preset.name}</strong> · tint <code>{preset.tint}</code> · the metal
              surface, aurora border and glow are pure CSS with zero extra dependencies.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
