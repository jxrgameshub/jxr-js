/**
 * JXR.js — Top Navigation Bar
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Branding, runtime status, and global controls
 */

import { useJXR } from '@/contexts/JXRContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Sun,
  Moon,
  Play,
  Settings,
  Terminal,
  GitBranch,
  Wifi,
  WifiOff,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663435100945/N4herHfeSthyfzuGXbFj8P/jxr-logo-mark-944pCTDiSWor8w5GuRTBUW.webp';

export function TopBar() {
  const { metrics, isInitialized, refreshPreview } = useJXR();
  const { theme, toggleTheme } = useTheme();

  const moqState = metrics?.moq.connectionState ?? 'disconnected';
  const isConnected = moqState === 'connected';

  return (
    <header className="flex items-center h-10 border-b border-border bg-card/80 backdrop-blur-sm px-3 gap-3 shrink-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded overflow-hidden">
          <img src={LOGO_URL} alt="JXR" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-shimmer tracking-tight">JXR.js</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.0.0-edge</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Runtime status pills */}
      <div className="flex items-center gap-1.5">
        {/* MoQ connection */}
        <div className={cn(
          'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border',
          isConnected
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        )}>
          {isConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
          <span>MoQ</span>
        </div>

        {/* Worker pool */}
        {metrics && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-lava/30 bg-lava/10 text-lava">
            <Layers className="w-2.5 h-2.5" />
            <span>{metrics.workerPool.totalWorkers}W</span>
          </div>
        )}

        {/* Throughput */}
        {metrics && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground font-mono">
            <span>{metrics.workerPool.throughputPerSec}/s</span>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center: project name */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
        <GitBranch className="w-3 h-3" />
        <span className="font-mono">main</span>
        <span className="text-border">·</span>
        <span className="font-mono text-foreground/70">jxr-project</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all',
            'bg-lava text-lava-foreground hover:bg-lava/90 glow-lava',
            !isInitialized && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => {
            refreshPreview();
            toast.success('Preview refreshed', { duration: 1000 });
          }}
          disabled={!isInitialized}
        >
          <Play className="w-3 h-3" />
          <span className="hidden sm:inline">Run</span>
        </button>

        <button
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={() => toast.info('Terminal: use the panel below', { duration: 2000 })}
          title="Terminal"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={() => toast.info('Settings coming soon', { duration: 2000 })}
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lava scan line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--lava), var(--cyan-accent), var(--lava), transparent)',
          backgroundSize: '200% 100%',
          animation: 'scanline 4s linear infinite',
          opacity: 0.6,
        }}
      />
    </header>
  );
}
