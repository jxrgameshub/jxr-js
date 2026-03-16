/**
 * JXR.js — Live Preview Pane
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Zero-build React preview rendered in sandboxed iframe
 */

import { useRef, useEffect, useState } from 'react';
import { useJXR } from '@/contexts/JXRContext';
import { RefreshCw, ExternalLink, Monitor, Smartphone, Tablet, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function LivePreview() {
  const { previewHtml, previewState, previewError, refreshPreview } = useJXR();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update iframe content when preview HTML changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !previewHtml) return;

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshPreview();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          {/* Viewport toggles */}
          {([
            ['desktop', Monitor],
            ['tablet', Tablet],
            ['mobile', Smartphone],
          ] as [ViewportSize, React.ElementType][]).map(([size, Icon]) => (
            <button
              key={size}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewport === size
                  ? 'bg-lava/20 text-lava'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
              onClick={() => setViewport(size)}
              title={`${size} viewport`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* URL bar */}
        <div className="flex-1 mx-3">
          <div className="flex items-center gap-2 bg-input rounded px-2 py-1 text-xs font-mono text-muted-foreground">
            <span className="text-success">●</span>
            <span>jxr://preview/localhost</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* State indicator */}
          <div className={cn(
            'flex items-center gap-1.5 text-[10px] px-2 py-1 rounded',
            previewState === 'ready' && 'text-success bg-success/10',
            previewState === 'building' && 'text-warning bg-warning/10',
            previewState === 'error' && 'text-destructive bg-destructive/10',
            previewState === 'idle' && 'text-muted-foreground',
          )}>
            {previewState === 'building' && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
            {previewState === 'ready' && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
            {previewState === 'error' && <AlertTriangle className="w-3 h-3" />}
            <span className="uppercase tracking-wide font-semibold">
              {previewState === 'building' ? 'Building' :
               previewState === 'ready' ? 'Live' :
               previewState === 'error' ? 'Error' : 'Idle'}
            </span>
          </div>

          <button
            className={cn(
              'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors',
              isRefreshing && 'text-lava'
            )}
            onClick={handleRefresh}
            title="Refresh preview"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>

          <button
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Open in new tab"
            onClick={() => {
              const blob = new Blob([previewHtml], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex-1 overflow-hidden bg-[#f8f8f8] dark:bg-[#1a1a1a] flex items-start justify-center">
        {previewState === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <div className="text-center">
              <p className="text-sm font-semibold text-destructive mb-2">Preview Error</p>
              <pre className="text-xs text-muted-foreground bg-muted/40 rounded p-3 max-w-sm text-left overflow-auto">
                {previewError}
              </pre>
            </div>
            <button
              className="text-xs text-lava hover:underline"
              onClick={handleRefresh}
            >
              Try again
            </button>
          </div>
        ) : (
          <div
            className="h-full transition-all duration-300 relative"
            style={{ width: VIEWPORT_WIDTHS[viewport] }}
          >
            {/* Viewport border indicator for non-desktop */}
            {viewport !== 'desktop' && (
              <div className="absolute -top-5 left-0 right-0 text-center text-[10px] text-muted-foreground">
                {VIEWPORT_WIDTHS[viewport]}
              </div>
            )}
            <iframe
              ref={iframeRef}
              className={cn(
                'w-full h-full border-0',
                viewport !== 'desktop' && 'shadow-xl rounded-b-lg'
              )}
              sandbox="allow-scripts allow-same-origin"
              title="JXR Live Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
