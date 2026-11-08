import { useState } from 'react';
import { Lock, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  AppSettings,
  StorageUnitMode,
  ThemeAppearance,
} from '../../types/storage';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleExclude: (path: string) => void;
  onClearHistory: () => void;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  onToggleExclude,
  onClearHistory,
}: SettingsViewProps) {
  const [newExcludedPath, setNewExcludedPath] = useState('');

  const handleAddExcluded = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newExcludedPath.trim();
    if (!cleaned) return;
    if (!settings.excludedFolders.includes(cleaned)) {
      onToggleExclude(cleaned);
    }
    setNewExcludedPath('');
  };

  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div
        className="pb-4 border-b space-y-1"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          Settings
        </h1>
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          Configure display units, directory walker behavior, local-only privacy
          guarantees, and cleanup safeguards.
        </p>
      </div>

      {/* 1. GENERAL */}
      <section className="space-y-3">
        <h2
          className="text-xs font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          General
        </h2>
        <div
          className="border rounded-lg divide-y text-xs"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {/* Appearance */}
          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Appearance
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Select the macOS window surface theme.
              </div>
            </div>
            <div
              className="inline-flex p-0.5 rounded-md border shrink-0"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
              }}
            >
              {(
                [
                  { id: 'dark', label: 'Carbon Dark' },
                  { id: 'slate', label: 'Dimmed Slate' },
                  { id: 'light', label: 'Daylight' },
                ] as { id: ThemeAppearance; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ appearance: opt.id })}
                  className="px-3 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor:
                      settings.appearance === opt.id
                        ? 'var(--cs-surface-elevated)'
                        : 'transparent',
                    color:
                      settings.appearance === opt.id
                        ? 'var(--cs-text)'
                        : 'var(--cs-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Units */}
          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Storage units
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                macOS Finder uses Base-10 (1 GB = 1,000,000,000 bytes). Binary
                uses Base-2 (GiB).
              </div>
            </div>
            <div
              className="inline-flex p-0.5 rounded-md border shrink-0"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
              }}
            >
              {(
                [
                  { id: 'decimal', label: 'Decimal (GB)' },
                  { id: 'binary', label: 'Binary (GiB)' },
                ] as { id: StorageUnitMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ storageUnits: opt.id })}
                  className="px-3 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor:
                      settings.storageUnits === opt.id
                        ? 'var(--cs-surface-elevated)'
                        : 'transparent',
                    color:
                      settings.storageUnits === opt.id
                        ? 'var(--cs-text)'
                        : 'var(--cs-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default scan location */}
          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Default scan location
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Root mount point or developer directory targeted when clicking
                Scan Storage.
              </div>
            </div>
            <select
              value={settings.defaultScanLocation}
              onChange={(e) =>
                onUpdateSettings({ defaultScanLocation: e.target.value })
              }
              className="px-3 py-1.5 rounded-md border font-mono text-xs focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <option value="/">Macintosh HD (/)</option>
              <option value="/Users/alex">Home (/Users/alex)</option>
              <option value="~/Projects">Developer Workspace (~/Projects)</option>
              <option value="~/Library/Developer">
                Apple Developer (~/Library/Developer)
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. SCANNING */}
      <section className="space-y-3">
        <h2
          className="text-xs font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          Scanning
        </h2>
        <div
          className="border rounded-lg divide-y text-xs"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {/* Excluded Folders */}
          <div
            className="p-4 space-y-3"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Excluded folders
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Directories skipped during filesystem traversal and hidden from
                cleanup prompts.
              </div>
            </div>

            <div className="space-y-1.5">
              {settings.excludedFolders.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded border font-mono text-[11.5px]"
                  style={{
                    backgroundColor: 'var(--cs-bg)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text)',
                  }}
                >
                  <span className="truncate">{path}</span>
                  <button
                    type="button"
                    onClick={() => onToggleExclude(path)}
                    className="p-0.5 rounded cursor-pointer shrink-0"
                    style={{ color: 'var(--cs-text-muted)' }}
                    title="Remove exclusion"
                    aria-label={`Remove ${path} from exclusions`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddExcluded} className="flex gap-2">
              <input
                type="text"
                value={newExcludedPath}
                onChange={(e) => setNewExcludedPath(e.target.value)}
                placeholder="Add path to exclude (e.g. ~/Projects/archive-vault)…"
                className="flex-1 px-3 py-1.5 rounded-md border font-mono text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text)',
                }}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Path</span>
              </button>
            </form>
          </div>

          {/* Scan Depth */}
          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Maximum directory depth
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Controls recursion limit when indexing deeply nested trees like
                pnpm or Cargo caches.
              </div>
            </div>
            <select
              value={settings.maxScanDepth}
              onChange={(e) =>
                onUpdateSettings({
                  maxScanDepth: e.target.value as AppSettings['maxScanDepth'],
                })
              }
              className="px-3 py-1.5 rounded-md border text-xs focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <option value="unlimited">Unlimited depth (Recommended)</option>
              <option value="12">12 directory levels</option>
              <option value="8">8 directory levels</option>
              <option value="5">5 directory levels (Fast summary)</option>
            </select>
          </div>

          {/* Hidden Files */}
          <div
            className="p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Scan hidden dotfiles & dot-directories
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Required to detect <code className="font-mono">.venv</code>,{' '}
                <code className="font-mono">.npm</code>,{' '}
                <code className="font-mono">.gradle</code>, and{' '}
                <code className="font-mono">.turbo</code> caches.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.includeHiddenFiles}
              onChange={(e) =>
                onUpdateSettings({ includeHiddenFiles: e.target.checked })
              }
              className="w-4 h-4 accent-[#A6B8FF] cursor-pointer shrink-0"
            />
          </div>

          {/* Symlink handling */}
          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Symbolic link handling
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Ignoring symlinks prevents double-counting pnpm virtual stores
                and circular filesystem loops.
              </div>
            </div>
            <select
              value={settings.symlinkHandling}
              onChange={(e) =>
                onUpdateSettings({
                  symlinkHandling: e.target
                    .value as AppSettings['symlinkHandling'],
                })
              }
              className="px-3 py-1.5 rounded-md border text-xs focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <option value="ignore">Do not follow symlinks (Accurate)</option>
              <option value="follow-local">
                Follow same-volume symlinks only
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. PRIVACY */}
      <section className="space-y-3">
        <h2
          className="text-xs font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          Privacy & Local Architecture
        </h2>
        <div
          className="border rounded-lg divide-y text-xs"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div
            className="p-4 flex items-start gap-3"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <ShieldCheck
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: 'var(--cs-success)' }}
            />
            <div className="space-y-1">
              <div
                className="font-semibold"
                style={{ color: 'var(--cs-text)' }}
              >
                Strict Local-Only Scanning Guarantee
              </div>
              <p
                className="leading-relaxed"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                Clearspace executes entirely on your Mac. Directory names,
                repository paths, project metadata, and scan snapshots never
                leave your machine and are never transmitted to any cloud
                endpoint.
              </p>
            </div>
          </div>

          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Scan history retention
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Retention window for local SQLite scan snapshots.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={settings.scanHistoryRetention}
                onChange={(e) =>
                  onUpdateSettings({
                    scanHistoryRetention: e.target
                      .value as AppSettings['scanHistoryRetention'],
                  })
                }
                className="px-3 py-1.5 rounded-md border text-xs focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text)',
                }}
              >
                <option value="30d">Keep 30 days</option>
                <option value="90d">Keep 90 days</option>
                <option value="forever">Keep indefinitely</option>
                <option value="session">Current session only</option>
              </select>

              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text-secondary)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Prune History</span>
              </button>
            </div>
          </div>

          <div
            className="p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Telemetry & analytics collection
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Permanently disabled by design. Clearspace ships zero telemetry
                SDKs.
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[11px]"
              style={{ color: 'var(--cs-text-muted)' }}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Disabled (Air-gapped)</span>
            </span>
          </div>
        </div>
      </section>

      {/* 4. CLEANUP SAFEGUARDS */}
      <section className="space-y-3">
        <h2
          className="text-xs font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          Cleanup Safeguards
        </h2>
        <div
          className="border rounded-lg divide-y text-xs"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div
            className="p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Move to macOS Trash instead of permanent removal
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Uses native macOS Trash (`NSFileManager.trashItem`) so items can
                be put back immediately if needed.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.moveToTrashInsteadOfPermanent}
              onChange={(e) =>
                onUpdateSettings({
                  moveToTrashInsteadOfPermanent: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#A6B8FF] cursor-pointer shrink-0"
            />
          </div>

          <div
            className="p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Always display pre-cleanup impact & recovery review
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Shows restoration CLI commands and active dependency checks
                before every cleanup action.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.requireReviewChecklist}
              onChange={(e) =>
                onUpdateSettings({
                  requireReviewChecklist: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#A6B8FF] cursor-pointer shrink-0"
            />
          </div>

          <div
            className="p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Protect repositories with uncommitted Git changes or missing
                lockfiles
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Automatically elevates artifacts without lockfiles to Review
                Required.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.protectGitUncommitted}
              onChange={(e) =>
                onUpdateSettings({
                  protectGitUncommitted: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#A6B8FF] cursor-pointer shrink-0"
            />
          </div>

          <div
            className="p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--cs-border-subtle)' }}
          >
            <div className="space-y-0.5">
              <div className="font-medium" style={{ color: 'var(--cs-text)' }}>
                Protect named Docker volumes & local database directories
              </div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Prevents PostgreSQL, MySQL, Redis, and SQLite persistent data
                from appearing in safe cleanup queues.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.protectDockerVolumes}
              onChange={(e) =>
                onUpdateSettings({
                  protectDockerVolumes: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#A6B8FF] cursor-pointer shrink-0"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
