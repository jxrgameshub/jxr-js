/**
 * JXR.js — IDE Shell (Edge OS Layout)
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Full-viewport resizable panel layout: Explorer | Editor | Preview | Metrics
 */

import { useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { LivePreview } from './LivePreview';
import { PerformanceDashboard, TerminalPane } from './PerformanceDashboard';
import { TopBar } from './TopBar';
import {
  Files,
  Activity,
  LayoutPanelLeft,
  PanelBottomClose,
  PanelBottomOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarTab = 'explorer' | 'metrics';

export function IDEShell() {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('explorer');
  const [showTerminal, setShowTerminal] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top bar */}
      <TopBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity bar (icon rail) */}
        <div className="flex flex-col items-center gap-1 w-10 bg-sidebar border-r border-sidebar-border py-2 shrink-0">
          <button
            className={cn(
              'p-2 rounded transition-colors',
              sidebarTab === 'explorer'
                ? 'text-lava bg-lava/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
            onClick={() => setSidebarTab('explorer')}
            title="File Explorer"
          >
            <Files className="w-4 h-4" />
          </button>
          <button
            className={cn(
              'p-2 rounded transition-colors',
              sidebarTab === 'metrics'
                ? 'text-lava bg-lava/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
            onClick={() => setSidebarTab('metrics')}
            title="Runtime Metrics"
          >
            <Activity className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          <button
            className={cn(
              'p-2 rounded transition-colors',
              showRightPanel
                ? 'text-lava bg-lava/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setShowRightPanel((v) => !v)}
            title="Toggle preview panel"
          >
            <LayoutPanelLeft className="w-4 h-4" />
          </button>

          <button
            className={cn(
              'p-2 rounded transition-colors',
              showTerminal
                ? 'text-lava bg-lava/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setShowTerminal((v) => !v)}
            title="Toggle terminal"
          >
            {showTerminal ? (
              <PanelBottomClose className="w-4 h-4" />
            ) : (
              <PanelBottomOpen className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Main content area */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left sidebar */}
          <ResizablePanel defaultSize={16} minSize={12} maxSize={28}>
            {sidebarTab === 'explorer' ? (
              <FileExplorer />
            ) : (
              <PerformanceDashboard />
            )}
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border hover:bg-lava/40 transition-colors" />

          {/* Center: Editor + Terminal */}
          <ResizablePanel defaultSize={showRightPanel ? 46 : 84} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              {/* Code editor */}
              <ResizablePanel defaultSize={showTerminal ? 70 : 100} minSize={40}>
                <CodeEditor />
              </ResizablePanel>

              {/* Terminal */}
              {showTerminal && (
                <>
                  <ResizableHandle className="h-px bg-border hover:bg-lava/40 transition-colors" />
                  <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                    <TerminalPane />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Right: Preview + Metrics */}
          {showRightPanel && (
            <>
              <ResizableHandle className="w-px bg-border hover:bg-lava/40 transition-colors" />
              <ResizablePanel defaultSize={38} minSize={25}>
                <ResizablePanelGroup direction="vertical">
                  {/* Live preview */}
                  <ResizablePanel defaultSize={65} minSize={40}>
                    <LivePreview />
                  </ResizablePanel>

                  <ResizableHandle className="h-px bg-border hover:bg-lava/40 transition-colors" />

                  {/* Metrics panel */}
                  <ResizablePanel defaultSize={35} minSize={20}>
                    <PerformanceDashboard />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
