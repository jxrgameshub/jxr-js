/**
 * JXR.js — Landing / Splash Page
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Hero section showcasing JXR.js capabilities
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Radio, Layers, GitBranch, Terminal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663435100945/N4herHfeSthyfzuGXbFj8P/jxr-hero-bg-C2Vg2XuLuccTULNjTsLvnn.webp';
const WORKER_NODES = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663435100945/N4herHfeSthyfzuGXbFj8P/jxr-worker-nodes-mfRehMGmXZQb9DNKC4M7MA.webp';
const MOQ_STREAM = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663435100945/N4herHfeSthyfzuGXbFj8P/jxr-moq-stream-DJ8jFUmk7fbpGM5EwhuFYY.webp';
const CRYPTO_SHIELD = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663435100945/N4herHfeSthyfzuGXbFj8P/jxr-crypto-shield-H4owYyan7BZhKBhnhC7z5f.webp';
const LOGO_MARK = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663435100945/N4herHfeSthyfzuGXbFj8P/jxr-logo-mark-944pCTDiSWor8w5GuRTBUW.webp';

const FEATURES = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Zero Build Step',
    desc: 'JSX renders directly in the browser. No webpack, no Vite, no Bun. Pure edge execution.',
    color: 'lava',
    image: WORKER_NODES,
  },
  {
    icon: <Radio className="w-5 h-5" />,
    title: 'MoQ Transport',
    desc: 'Media over QUIC streaming replaces HTTP polling. Sub-RTT latency for module delivery.',
    color: 'cyan',
    image: MOQ_STREAM,
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Web Crypto Native',
    desc: 'AES-GCM-256 module caching, ECDSA P-256 signing. Universal across all runtimes.',
    color: 'green',
    image: CRYPTO_SHIELD,
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Worker Pool',
    desc: 'Pre-warmed Web Worker fleet saturates all CPU cores. Priority-queued task dispatch.',
    color: 'yellow',
    image: WORKER_NODES,
  },
];

const BENCHMARKS = [
  { label: 'Cold Start', jxr: '0ms', nextjs: '2,400ms', vite: '800ms', bun: '350ms' },
  { label: 'HMR Update', jxr: '<1ms', nextjs: '180ms', vite: '45ms', bun: '30ms' },
  { label: 'Module Load', jxr: '2ms', nextjs: '320ms', vite: '85ms', bun: '40ms' },
  { label: 'Build Time', jxr: 'N/A', nextjs: '45s', vite: '12s', bun: '8s' },
  { label: 'Memory', jxr: '18MB', nextjs: '420MB', vite: '180MB', bun: '95MB' },
];

const CODE_SAMPLE = `// JXR.js — No build step required
// This JSX runs directly in the browser

import { useState } from 'react';

export default function EdgeApp() {
  const [data, setData] = useState(null);

  // MoQ streaming — sub-RTT delivery
  useEffect(() => {
    const unsub = moq.subscribe({
      track: { namespace: 'jxr', trackName: 'live-data' },
      deliveryOrder: 'ascending',
      handler: (obj) => setData(obj.payload),
    });
    return unsub;
  }, []);

  return (
    <div className="edge-app">
      <h1>JXR Edge Runtime</h1>
      <p>Latency: {data?.rtt}ms</p>
    </div>
  );
}`;

interface LandingPageProps {
  onEnterIDE: () => void;
}

export function LandingPage({ onEnterIDE }: LandingPageProps) {
  const [activeFeature, setActiveFeature] = useState(0);
  const [typedCode, setTypedCode] = useState('');
  const [codeIndex, setCodeIndex] = useState(0);

  // Typewriter effect for code sample
  useEffect(() => {
    if (codeIndex >= CODE_SAMPLE.length) return;
    const timeout = setTimeout(() => {
      setTypedCode(CODE_SAMPLE.slice(0, codeIndex + 1));
      setCodeIndex((i) => i + 1);
    }, 12);
    return () => clearTimeout(timeout);
  }, [codeIndex]);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((i) => (i + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const colorMap: Record<string, string> = {
    lava: 'text-lava border-lava/30 bg-lava/10',
    cyan: 'text-cyan-accent border-cyan-accent/30 bg-cyan-accent/10',
    green: 'text-success border-success/30 bg-success/10',
    yellow: 'text-warning border-warning/30 bg-warning/10',
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>

        {/* Top nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-3">
            <img src={LOGO_MARK} alt="JXR" className="w-8 h-8 rounded" />
            <div>
              <span className="text-lg font-bold text-shimmer">JXR.js</span>
              <span className="ml-2 text-[10px] text-muted-foreground font-mono">v1.0.0-edge</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">
              Features
            </a>
            <a href="#benchmarks" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">
              Benchmarks
            </a>
            <button
              onClick={onEnterIDE}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lava text-lava-foreground text-sm font-semibold hover:bg-lava/90 transition-all glow-lava"
            >
              Open IDE
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 max-w-4xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lava/30 bg-lava/10 text-lava text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-lava animate-pulse" />
              Powered by JXR Studios × DamascusAI
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
              <span className="text-shimmer">The Edge OS</span>
              <br />
              <span className="text-foreground">for React</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              JXR.js renders React directly in the browser with{' '}
              <strong className="text-foreground">zero build step</strong>.
              MoQ streaming, Web Crypto integrity, and a pre-warmed Worker pool
              deliver performance that makes Next.js, Vite, and Bun look slow.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
              <button
                onClick={onEnterIDE}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-lava text-lava-foreground font-bold text-base hover:bg-lava/90 transition-all glow-lava w-full sm:w-auto"
              >
                <Terminal className="w-4 h-4" />
                Launch IDE
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#benchmarks"
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-semibold text-base hover:border-lava/50 hover:bg-lava/5 transition-all w-full sm:w-auto"
              >
                View Benchmarks
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 pt-4 text-sm">
              {[
                { label: 'Cold Start', value: '0ms' },
                { label: 'HMR Latency', value: '<1ms' },
                { label: 'Build Step', value: 'None' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-black text-lava font-mono">{value}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40 animate-bounce">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-lava/40" />
            <ChevronRight className="w-4 h-4 rotate-90" />
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Built for the <span className="text-gradient-lava">Edge</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every layer of JXR.js is designed to eliminate latency and maximize throughput
              at the edge of the network.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature cards */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200',
                    activeFeature === i
                      ? 'border-lava/40 bg-lava/5 shadow-lg'
                      : 'border-border bg-card hover:border-border/80'
                  )}
                  onClick={() => setActiveFeature(i)}
                  whileHover={{ x: 4 }}
                >
                  <div className={cn('p-2 rounded-lg border shrink-0', colorMap[f.color])}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Feature image */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card aspect-video md:aspect-auto">
              {FEATURES.map((f, i) => (
                <img
                  key={f.title}
                  src={f.image}
                  alt={f.title}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                    activeFeature === i ? 'opacity-100' : 'opacity-0'
                  )}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-sm font-bold">{FEATURES[activeFeature].title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {FEATURES[activeFeature].desc}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Code sample ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-3">
              Write Once, <span className="text-gradient-lava">Run Everywhere</span>
            </h2>
            <p className="text-muted-foreground">
              Standard React code. No special APIs. No framework lock-in.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-[oklch(0.09_0.005_260)] overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="ml-3 text-[11px] font-mono text-muted-foreground">App.tsx — JXR Edge Runtime</span>
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live
              </div>
            </div>
            <pre className="p-6 text-xs font-mono text-foreground/80 overflow-x-auto leading-relaxed">
              <code>{typedCode}<span className="animate-pulse text-lava">|</span></code>
            </pre>
          </div>
        </div>
      </section>

      {/* ─── Benchmarks ────────────────────────────────────────────────── */}
      <section id="benchmarks" className="py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Performance <span className="text-gradient-lava">Benchmarks</span>
            </h2>
            <p className="text-muted-foreground">
              JXR.js eliminates the build step entirely — making comparison almost unfair.
            </p>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Metric</th>
                  <th className="text-center px-4 py-3">
                    <span className="text-lava font-bold">JXR.js</span>
                  </th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium text-xs">Next.js</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium text-xs">Vite</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium text-xs">Bun</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((row, i) => (
                  <tr key={row.label} className={cn('border-b border-border/50', i % 2 === 0 ? 'bg-background' : 'bg-card/30')}>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold font-mono text-lava">{row.jxr}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">{row.nextjs}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">{row.vite}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">{row.bun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            * JXR.js has no build step — cold start is the time to first rendered pixel.
          </p>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={MOQ_STREAM} alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to go <span className="text-shimmer">beyond the edge</span>?
          </h2>
          <p className="text-muted-foreground mb-8">
            Open the JXR IDE and start building React apps that run at the speed of the edge.
            No installation. No build step. Just code.
          </p>
          <button
            onClick={onEnterIDE}
            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-lava text-lava-foreground font-bold text-lg hover:bg-lava/90 transition-all glow-lava mx-auto"
          >
            <Terminal className="w-5 h-5" />
            Launch JXR IDE
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="mt-6 text-xs text-muted-foreground">
            Powered by <span className="text-lava font-semibold">JXR Studios</span> × <span className="text-cyan-accent font-semibold">DamascusAI</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_MARK} alt="JXR" className="w-6 h-6 rounded" />
            <span className="text-sm font-bold text-shimmer">JXR.js</span>
            <span className="text-xs text-muted-foreground">Edge OS Runtime</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <GitBranch className="w-3 h-3" />
            <span>Built with precision by JXR Studios × DamascusAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
