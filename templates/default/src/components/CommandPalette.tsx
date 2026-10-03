import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

export interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string[];
  icon?: ReactNode;
  /** Optional secondary line (used for template descriptions). */
  description?: string;
  /** Optional accent color, rendered as a small swatch dot. */
  accent?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
  placeholder?: string;
}

/**
 * CommandPalette — a ⌘K / Ctrl-K launcher built on Radix Dialog.
 *
 * Radix supplies the accessible shell (focus trap, escape + overlay close,
 * aria wiring); we add fuzzy-ish filtering and arrow-key navigation over the
 * grouped command list. Selecting a command runs its `onSelect` and closes.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = 'Search tools, features and templates…',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const haystack = [cmd.label, cmd.group, cmd.hint, ...(cmd.keywords ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  // Group the filtered results while preserving a stable flat order for
  // keyboard navigation.
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of results) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return Array.from(map, ([group, items]) => ({ group, items }));
  }, [results]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const run = (cmd: Command) => {
    onOpenChange(false);
    cmd.onSelect();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length ? (index - 1 + results.length) % results.length : 0
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = results[activeIndex];
      if (cmd) run(cmd);
    }
  };

  let flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="jxr-palette" aria-label="Command palette">
        <DialogTitle className="jxr-sr-only">Command palette</DialogTitle>
        <DialogDescription className="jxr-sr-only">
          Search and run tools, features and templates.
        </DialogDescription>

        <div className="jxr-palette-input">
          <Search className="jxr-palette-search-icon" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Search commands"
            className="jxr-palette-field"
          />
          <kbd className="jxr-kbd">esc</kbd>
        </div>

        <div className="jxr-palette-list" role="listbox" ref={listRef}>
          {grouped.length === 0 && (
            <p className="jxr-palette-empty">No matches for “{query}”.</p>
          )}

          {grouped.map(({ group, items }) => (
            <div key={group} className="jxr-palette-group">
              <p className="jxr-palette-group-label">{group}</p>
              {items.map((cmd) => {
                flatIndex += 1;
                const index = flatIndex;
                const active = index === activeIndex;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    className={cn('jxr-palette-item', active && 'is-active')}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => run(cmd)}
                  >
                    {cmd.accent ? (
                      <span
                        className="jxr-palette-swatch"
                        style={{ background: cmd.accent }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="jxr-palette-item-icon" aria-hidden="true">
                        {cmd.icon}
                      </span>
                    )}
                    <span className="jxr-palette-item-body">
                      <span className="jxr-palette-item-label">{cmd.label}</span>
                      {cmd.description && (
                        <span className="jxr-palette-item-desc">{cmd.description}</span>
                      )}
                      {cmd.hint && <span className="jxr-palette-item-hint">{cmd.hint}</span>}
                    </span>
                    {active && <CornerDownLeft className="jxr-palette-enter" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="jxr-palette-footer">
          <span>
            <kbd className="jxr-kbd">↑</kbd> <kbd className="jxr-kbd">↓</kbd> to navigate
          </span>
          <span>
            <kbd className="jxr-kbd">↵</kbd> to run
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
