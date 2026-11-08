import { useMemo, useState } from 'react';
import { Folder, FileCode, Search, X } from 'lucide-react';
import { flattenStorageTree } from '../services/filesystem/types';
import { StorageItem, StorageUnitMode } from '../types/storage';
import { formatBytes } from '../utils/format';
import { RiskIndicator } from './RiskIndicator';

interface QuickSearchModalProps {
  isOpen: boolean;
  rootItem: StorageItem;
  unitMode: StorageUnitMode;
  onClose: () => void;
  onSelectInspect: (item: StorageItem) => void;
  onOpenInExplorer: (itemId: string) => void;
}

export function QuickSearchModal({
  isOpen,
  rootItem,
  unitMode,
  onClose,
  onSelectInspect,
  onOpenInExplorer,
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');

  const allItems = useMemo(() => {
    return flattenStorageTree(rootItem).sort(
      (a, b) => b.sizeBytes - a.sizeBytes
    );
  }, [rootItem]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 10);
    return allItems
      .filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.path.toLowerCase().includes(q) ||
          (it.associatedProject &&
            it.associatedProject.toLowerCase().includes(q)) ||
          it.category.toLowerCase().includes(q)
      )
      .slice(0, 14);
  }, [allItems, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--cs-sidebar)',
          borderColor: 'var(--cs-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--cs-border)' }}
        >
          <Search
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--cs-accent)' }}
          />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search folders, node_modules, Xcode caches, or projects…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--cs-text)' }}
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded cursor-pointer"
            style={{ color: 'var(--cs-text-muted)' }}
            aria-label="Close quick search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: 'var(--cs-border-subtle)' }}>
          {results.length === 0 ? (
            <div
              className="py-10 text-center text-xs"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              No scanned paths match "{query}".
            </div>
          ) : (
            results.map((item) => {
              const isDir = item.children && item.children.length > 0;
              return (
                <div
                  key={item.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-4 transition-colors hover:bg-[var(--cs-surface-hover)]"
                  style={{ borderColor: 'var(--cs-border-subtle)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectInspect(item);
                      onClose();
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    {isDir ? (
                      <Folder
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--cs-accent)' }}
                      />
                    ) : (
                      <FileCode
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      />
                    )}
                    <div className="min-w-0">
                      <div
                        className="text-xs font-medium truncate"
                        style={{ color: 'var(--cs-text)' }}
                      >
                        {item.name}
                      </div>
                      <div
                        className="text-[11px] font-mono truncate"
                        style={{ color: 'var(--cs-text-muted)' }}
                      >
                        {item.path}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-4 shrink-0">
                    <RiskIndicator risk={item.risk} compact />
                    <span
                      className="text-xs font-mono tabular-nums w-20 text-right"
                      style={{ color: 'var(--cs-text)' }}
                    >
                      {formatBytes(item.sizeBytes, unitMode)}
                    </span>
                    {isDir && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenInExplorer(item.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: 'var(--cs-bg)',
                          borderColor: 'var(--cs-border)',
                          color: 'var(--cs-text-secondary)',
                        }}
                      >
                        Explore
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          className="px-4 py-2 border-t flex items-center justify-between text-[11px]"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
            color: 'var(--cs-text-muted)',
          }}
        >
          <span>Click an item to open Inspection Drawer</span>
          <span>Demo Snapshot · Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
