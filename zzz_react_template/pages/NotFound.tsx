/**
 * JXR.js — 404 Not Found
 * LavaFlow OS Design System
 */

import { Link } from 'wouter';
import { Zap, ArrowLeft, Terminal } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'oklch(0.09 0.005 285)' }}
    >
      <div className="text-center max-w-lg px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'oklch(0.62 0.21 42)', boxShadow: '0 0 40px oklch(0.62 0.21 42 / 30%)' }}
          >
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl" style={{ fontFamily: 'Space Grotesk' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, oklch(0.72 0.21 42) 0%, oklch(0.82 0.18 55) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >JXR</span>
            <span style={{ color: 'oklch(0.93 0.005 65)' }}>.js</span>
          </span>
        </div>

        {/* Error code */}
        <div
          className="font-mono text-9xl font-extrabold mb-4 leading-none"
          style={{ color: 'oklch(0.62 0.21 42 / 15%)' }}
        >
          404
        </div>

        <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk', color: 'oklch(0.85 0.01 65)' }}>
          Route not found
        </h1>
        <p className="mb-8" style={{ color: 'oklch(0.5 0.01 285)' }}>
          This path does not exist in the JXR edge runtime.
        </p>

        {/* Terminal hint */}
        <div
          className="rounded-lg p-4 font-mono text-sm mb-8 text-left relative"
          style={{
            background: 'oklch(0.06 0.004 285)',
            border: '1px solid oklch(1 0 0 / 8%)',
          }}
        >
          <span style={{ color: 'oklch(0.62 0.21 42)' }}>$ </span>
          <span style={{ color: 'oklch(0.85 0.01 65)' }}>jxr info</span>
          <br />
          <span style={{ color: 'oklch(0.45 0.01 285)' }}># Check available routes</span>
          <span
            style={{
              display: 'inline-block',
              width: '2px',
              height: '1.1em',
              background: 'oklch(0.62 0.21 42)',
              verticalAlign: 'text-bottom',
              marginLeft: '2px',
              animation: 'blink 1s step-end infinite',
            }}
          />
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="no-underline inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all"
            style={{
              background: 'oklch(0.62 0.21 42)',
              color: 'white',
            }}
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <Link
            href="/docs"
            className="no-underline inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: 'transparent',
              color: 'oklch(0.75 0.01 65)',
              border: '1px solid oklch(1 0 0 / 15%)',
            }}
          >
            <Terminal size={16} />
            Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
