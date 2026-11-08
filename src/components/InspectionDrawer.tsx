import { useState } from 'react';
import {
  Check,
  Copy,
  EyeOff,
  FolderOpen,
  Lock,
  Terminal,
  X,
} from 'lucide-react';
import {
  FileMetadata,
  StorageItem,
  StorageUnitMode,
} from '../types/storage';
import {
  CATEGORY_COLOR_MAP,
  formatBytes,
  formatDateTime,
  formatNumber,
  RISK_META,
} from '../utils/format';
import { RiskIndicator } from './RiskIndicator';

interface InspectionDrawerProps {
  item: (StorageItem | FileMetadata) | null;
  unitMode: StorageUnitMode;
  excludedFolders: string[];
  onClose: () => void;
  onToggleExclude: (path: string) => void;
  onViewContents: (itemId: string) => void;
  onCopySuccess: (msg: string) => void;
}

export function InspectionDrawer({
  item,
  unitMode,
  excludedFolders,
  onClose,
  onToggleExclude,
  onViewContents,
  onCopySuccess,
}: InspectionDrawerProps) {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!item) return null;

  const isExcluded = excludedFolders.includes(item.path);
  const hasChildren =
    'children' in item && Array.isArray(item.children) && item.children.length > 0;
  const catColor = CATEGORY_COLOR_MAP[item.category];
  const riskMeta = RISK_META[item.risk];

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(item.path);
      setCopiedPath(true);
      onCopySuccess(`Copied path: ${item.path}`);
      window.setTimeout(() => setCopiedPath(false), 1800);
    } catch {
      onCopySuccess(`Path: ${item.path}`);
    }
  };

  const handleCopyCommand = async () => {
    if (!item.recoveryCommand) return;
    try {
      await navigator.clipboard.writeText(item.recoveryCommand);
      setCopiedCmd(true);
      onCopySuccess('Copied recovery command to clipboard');
      window.setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      onCopySuccess(item.recoveryCommand);
    }
  };

  return (
    <aside
      aria-label="File Inspection Drawer"
      className="w-[410px] shrink-0 h-full border-l flex flex-col justify-between overflow-hidden"
      style={{
        backgroundColor: 'var(--cs-sidebar)',
        borderColor: 'var(--cs-border)',
      }}
    >
      {/* Drawer Header */}
      <div
        className="px-5 py-4 border-b flex items-start justify-between gap-3 shrink-0"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <div className="min-w-0">
          <div
            className="text-[11px] font-medium flex items-center gap-1.5"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            <span
              className="w-2 h-2 rounded-xs shrink-0"
              style={{ backgroundColor: catColor.hex }}
            />
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{item.fileTypeLabel}</span>
          </div>
          <h2
            className="text-base font-semibold tracking-tight mt-1 truncate"
            style={{ color: 'var(--cs-text)' }}
            title={item.name}
          >
            {item.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md transition-colors cursor-pointer shrink-0"
          style={{ color: 'var(--cs-text-secondary)' }}
          title="Close inspector (Esc)"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Metadata Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
        {/* Size & Risk Primary Summary */}
        <div
          className="p-3.5 rounded-lg border flex items-center justify-between gap-4"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div>
            <div style={{ color: 'var(--cs-text-secondary)' }}>Occupies</div>
            <div
              className="text-xl font-semibold font-mono tabular-nums mt-0.5"
              style={{ color: 'var(--cs-text)' }}
            >
              {formatBytes(item.sizeBytes, unitMode)}
            </div>
          </div>
          <div className="text-right">
            <div style={{ color: 'var(--cs-text-secondary)' }}>
              Classification
            </div>
            <div className="mt-1 flex justify-end">
              <RiskIndicator risk={item.risk} />
            </div>
          </div>
        </div>

        {/* Full Path */}
        <div>
          <div
            className="text-[11px] font-medium mb-1.5 flex items-center justify-between"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            <span>Full Path</span>
            {isExcluded && (
              <span style={{ color: 'var(--cs-warning)' }}>
                Excluded from future scans
              </span>
            )}
          </div>
          <div
            className="px-3 py-2 rounded-md border font-mono text-[11.5px] break-all leading-relaxed"
            style={{
              backgroundColor: 'var(--cs-bg)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text)',
            }}
          >
            {item.path}
          </div>
        </div>

        {/* Structured Attributes */}
        <div
          className="border-t border-b divide-y"
          style={{ borderColor: 'var(--cs-border-subtle)' }}
        >
          <div
            className="py-2.5 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <span style={{ color: 'var(--cs-text-secondary)' }}>File Type</span>
            <span
              className="font-medium text-right"
              style={{ color: 'var(--cs-text)' }}
            >
              {item.fileTypeLabel}
            </span>
          </div>

          <div
            className="py-2.5 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <span style={{ color: 'var(--cs-text-secondary)' }}>
              Last Modified
            </span>
            <span
              className="font-mono tabular-nums text-right"
              style={{ color: 'var(--cs-text)' }}
            >
              {formatDateTime(item.lastModified)}
            </span>
          </div>

          <div
            className="py-2.5 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <span style={{ color: 'var(--cs-text-secondary)' }}>Category</span>
            <span
              className="font-medium text-right"
              style={{ color: 'var(--cs-text)' }}
            >
              {item.category}
            </span>
          </div>

          <div
            className="py-2.5 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <span style={{ color: 'var(--cs-text-secondary)' }}>
              Associated Project
            </span>
            <span
              className="font-mono text-right"
              style={{ color: 'var(--cs-text)' }}
            >
              {item.associatedProject ?? 'System / Shared Global'}
            </span>
          </div>

          {typeof item.itemCount === 'number' && (
            <div
              className="py-2.5 flex items-center justify-between gap-4"
              style={{ borderColor: 'var(--cs-border-subtle)' }}
            >
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                Indexed Entries
              </span>
              <span
                className="font-mono tabular-nums text-right"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatNumber(item.itemCount)} items
              </span>
            </div>
          )}
        </div>

        {/* Why Identified / Detection Reason */}
        <div className="space-y-1.5">
          <h3
            className="text-xs font-semibold"
            style={{ color: 'var(--cs-text)' }}
          >
            Detection & Risk Evidence
          </h3>
          <p
            className="leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            {item.detectionReason}
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            {riskMeta.description}
          </p>
        </div>

        {/* Cleanup Impact */}
        <div className="space-y-1.5">
          <h3
            className="text-xs font-semibold"
            style={{ color: 'var(--cs-text)' }}
          >
            Potential Cleanup Impact
          </h3>
          <p
            className="leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            {item.cleanupImpact}
          </p>
        </div>

        {/* Regeneration Instructions */}
        {(item.regenerationInstructions || item.recoveryCommand) && (
          <div className="space-y-2">
            <h3
              className="text-xs font-semibold"
              style={{ color: 'var(--cs-text)' }}
            >
              Regeneration & Restoration
            </h3>
            {item.regenerationInstructions && (
              <p
                className="leading-relaxed"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {item.regenerationInstructions}
              </p>
            )}
            {item.recoveryCommand && (
              <div
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-accent)',
                }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Terminal className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.recoveryCommand}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="px-1.5 py-0.5 rounded text-[11px] cursor-pointer shrink-0"
                  style={{ color: 'var(--cs-text-secondary)' }}
                  title="Copy recovery command"
                >
                  {copiedCmd ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tauri Prototype Non-Destructive Guard Notice */}
        <div
          className="p-3 rounded-md border flex items-start gap-2.5 text-[11px] leading-relaxed"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
            color: 'var(--cs-text-secondary)',
          }}
        >
          <Lock
            className="w-3.5 h-3.5 shrink-0 mt-0.5"
            style={{ color: 'var(--cs-text-muted)' }}
          />
          <span>
            Destructive file operations are disabled in this browser prototype
            until connected to the native Tauri v2 Rust Trash engine.
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div
        className="p-4 border-t space-y-2 shrink-0"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyPath}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text)',
            }}
          >
            {copiedPath ? (
              <Check className="w-3.5 h-3.5" style={{ color: 'var(--cs-success)' }} />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedPath ? 'Path Copied' : 'Copy Path'}</span>
          </button>

          {hasChildren ? (
            <button
              type="button"
              onClick={() => onViewContents(item.id)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>View Contents</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <span>Close</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleExclude(item.path)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          style={{
            backgroundColor: isExcluded
              ? 'var(--cs-accent-muted)'
              : 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
            color: isExcluded ? 'var(--cs-accent)' : 'var(--cs-text-secondary)',
          }}
        >
          <EyeOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isExcluded
              ? 'Remove from Excluded Paths'
              : 'Exclude from Future Scans'}
          </span>
        </button>
      </div>
    </aside>
  );
}
