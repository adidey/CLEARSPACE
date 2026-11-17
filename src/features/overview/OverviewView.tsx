import { useState, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Folder,
  HardDrive,
  LayoutGrid,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import {
  CleanupRecommendation,
  NavSection,
  ScanResult,
  StorageCategory,
  StorageItem,
  StorageUnitMode,
} from '../../types/storage';
import {
  CATEGORY_COLOR_MAP,
  formatBytes,
  formatPercent,
} from '../../utils/format';

interface OverviewViewProps {
  scan: ScanResult;
  unitMode: StorageUnitMode;
  excludedFolders: string[];
  onStartScan: () => void;
  onRestoreDemo: () => void;
  onNavigate: (section: NavSection) => void;
  onInspectItem: (itemOrId: StorageItem | string) => void;
  onReviewRecommendation: (rec: CleanupRecommendation) => void;
  onExploreDirectory: (dirId: string) => void;
}

export function OverviewView({
  scan,
  unitMode,
  excludedFolders,
  onStartScan,
  onRestoreDemo,
  onNavigate,
  onInspectItem,
  onReviewRecommendation,
  onExploreDirectory,
}: OverviewViewProps) {
  const [hoveredCategory, setHoveredCategory] =
    useState<StorageCategory | null>(null);

  // Filter out categories with 0 bytes to prevent visual clutter
  const activeCategories = useMemo(() => {
    return scan.categories.filter((c) => c.sizeBytes > 0);
  }, [scan.categories]);

  // Group real artifacts by ecosystem
  const ecosystemSummary = useMemo(() => {
    const map = new Map<string, { label: string; bytes: number; count: number }>();
    for (const art of scan.artifacts) {
      const eco = art.ecosystem || 'OTHER';
      const label =
        eco === 'NODE_JS'
          ? 'Node.js & npm'
          : eco === 'PYTHON'
          ? 'Python Virtualenvs'
          : eco === 'APPLE_DEV'
          ? 'Xcode & DerivedData'
          : eco === 'DOCKER'
          ? 'Docker Volumes'
          : 'Other Toolchains';
      const existing = map.get(label) || { label, bytes: 0, count: 0 };
      existing.bytes += art.sizeBytes;
      existing.count += 1;
      map.set(label, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.bytes - a.bytes);
  }, [scan.artifacts]);

  const topThreeRecs = scan.recommendations.slice(0, 3);
  const scannedFolderBytes = scan.rootItem.sizeBytes;
  const isRecoverable = scan.recoverableBytes > 0;

  return (
    <div className="p-6 lg:px-10 lg:py-8 max-w-[1240px] mx-auto space-y-8 select-none">
      {/* 1. Header Zone: Clean & Calm */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--cs-border)' }}>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor: 'var(--cs-surface)',
                color: scan.isMockData ? 'var(--cs-warning)' : 'var(--cs-success)',
                border: '1px solid var(--cs-border)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scan.isMockData ? 'var(--cs-warning)' : 'var(--cs-success)' }} />
              {scan.isMockData ? 'Demo Dataset' : 'Active Scan'}
            </span>
            <span style={{ color: 'var(--cs-text-muted)' }}>·</span>
            <span className="truncate" style={{ color: 'var(--cs-text-secondary)' }}>
              {scan.volumeName} ({scan.volumeFormat})
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--cs-text)' }}>
            {scan.rootItem.name || 'Storage Overview'}
          </h1>

          <p className="text-xs font-mono truncate max-w-xl" style={{ color: 'var(--cs-text-muted)' }}>
            {scan.rootItem.path}
          </p>
        </div>

        {/* Hero Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('explorer')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors hover:bg-[var(--cs-surface-hover)]"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text)',
            }}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[var(--cs-accent)]" />
            <span>Open Treemap</span>
          </button>

          <button
            type="button"
            onClick={onStartScan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--cs-accent)',
              color: '#111214',
            }}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Choose Folder</span>
          </button>
        </div>
      </section>

      {/* 2. Key Metrics: Essential Numbers with High Contrast */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Scanned Footprint */}
        <div
          className="p-4.5 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="text-xs font-medium" style={{ color: 'var(--cs-text-secondary)' }}>
            Target Size
          </div>
          <div className="my-2 text-2xl font-semibold font-mono tabular-nums tracking-tight" style={{ color: 'var(--cs-text)' }}>
            {formatBytes(scannedFolderBytes, unitMode)}
          </div>
          <div className="text-[11px] font-mono" style={{ color: 'var(--cs-text-muted)' }}>
            {scan.scanDurationSeconds < 0.1
              ? 'Indexed instantly'
              : `Indexed in ${scan.scanDurationSeconds.toFixed(1)}s`}
          </div>
        </div>

        {/* Metric 2: Cleanable Space (Highlight when available) */}
        <div
          className="p-4.5 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: isRecoverable ? 'rgba(101, 201, 154, 0.04)' : 'var(--cs-surface)',
            borderColor: isRecoverable ? 'rgba(101, 201, 154, 0.3)' : 'var(--cs-border)',
          }}
        >
          <div className="text-xs font-medium flex items-center justify-between">
            <span style={{ color: isRecoverable ? 'var(--cs-success)' : 'var(--cs-text-secondary)' }}>
              Reclaimable
            </span>
            {isRecoverable && <Sparkles className="w-3.5 h-3.5 text-[var(--cs-success)]" />}
          </div>
          <div
            className="my-2 text-2xl font-semibold font-mono tabular-nums tracking-tight"
            style={{ color: isRecoverable ? 'var(--cs-success)' : 'var(--cs-text-muted)' }}
          >
            {formatBytes(scan.recoverableBytes, unitMode)}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
            {isRecoverable
              ? `${scan.recommendations.length} verified safe artifact${scan.recommendations.length === 1 ? '' : 's'}`
              : 'Zero safe cleanups found'}
          </div>
        </div>

        {/* Metric 3: Developer Artifacts */}
        <div
          className="p-4.5 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="text-xs font-medium" style={{ color: 'var(--cs-text-secondary)' }}>
            Artifacts Detected
          </div>
          <div className="my-2 text-2xl font-semibold font-mono tabular-nums tracking-tight" style={{ color: 'var(--cs-text)' }}>
            {scan.artifacts.length}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
            {scan.artifacts.length > 0
              ? `${ecosystemSummary.length} toolchain${ecosystemSummary.length === 1 ? '' : 's'} identified`
              : 'No build caches'}
          </div>
        </div>

        {/* Metric 4: Mac SSD Headroom */}
        <div
          className="p-4.5 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="text-xs font-medium" style={{ color: 'var(--cs-text-secondary)' }}>
            SSD Free Space
          </div>
          <div className="my-2 text-2xl font-semibold font-mono tabular-nums tracking-tight" style={{ color: 'var(--cs-text)' }}>
            {formatBytes(scan.availableBytes, unitMode)}
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: 'var(--cs-text-muted)' }}>
            {formatPercent((scan.availableBytes / scan.totalCapacityBytes) * 100)} of {formatBytes(scan.totalCapacityBytes, unitMode)} free
          </div>
        </div>
      </section>

      {/* 3. Reclaim Banner (Appears when cleanable items are detected) */}
      {isRecoverable && (
        <section
          className="p-4 rounded-xl border flex items-center justify-between gap-4"
          style={{
            backgroundColor: 'var(--cs-surface-elevated)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(101, 201, 154, 0.12)' }}
            >
              <ShieldCheck className="w-5 h-5 text-[var(--cs-success)]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--cs-text)' }}>
                {formatBytes(scan.recoverableBytes, unitMode)} can be safely reclaimed
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--cs-text-secondary)' }}>
                {scan.recommendations.length} build artifact{scan.recommendations.length === 1 ? '' : 's'} verified with intact lockfiles. Safe to trash and regenerate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('recommendations')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--cs-success)',
              color: '#111214',
            }}
          >
            <span>Review Cleanups</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* 4. Active Categories (Filtered: No 0 B Clutter!) */}
      {activeCategories.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-semibold tracking-tight text-sm" style={{ color: 'var(--cs-text)' }}>
              Storage Categories
            </h2>
            <span className="font-mono text-[11px]" style={{ color: 'var(--cs-text-muted)' }}>
              {activeCategories.length} active categor{activeCategories.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            {activeCategories.map((cat) => {
              const color = CATEGORY_COLOR_MAP[cat.category];
              const pctOfTarget =
                scannedFolderBytes > 0
                  ? (cat.sizeBytes / scannedFolderBytes) * 100
                  : 0;
              return (
                <div
                  key={cat.category}
                  className="p-3.5 rounded-xl border flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--cs-surface)',
                    borderColor: 'var(--cs-border)',
                  }}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="truncate" style={{ color: 'var(--cs-text)' }}>
                      {cat.category}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-semibold font-mono tabular-nums" style={{ color: 'var(--cs-text)' }}>
                    {formatBytes(cat.sizeBytes, unitMode)}
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono tabular-nums" style={{ color: 'var(--cs-text-muted)' }}>
                    {formatPercent(pctOfTarget)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Cleanups & Biggest Items Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Recommended Cleanups (7 cols) */}
        <section className="xl:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--cs-text)' }}>
              Cleanup Recommendations
            </h2>
            {scan.recommendations.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('recommendations')}
                className="inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
                style={{ color: 'var(--cs-accent)' }}
              >
                <span>View all ({scan.recommendations.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {scan.recommendations.length === 0 ? (
            <div
              className="p-8 rounded-xl border text-center space-y-2"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
              }}
            >
              <CheckCircle2 className="w-7 h-7 mx-auto text-[var(--cs-success)] opacity-80" />
              <div className="text-sm font-semibold" style={{ color: 'var(--cs-text)' }}>
                Target is clean
              </div>
              <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--cs-text-secondary)' }}>
                No disposable build artifacts or redundant caches were found in this directory.
              </p>
            </div>
          ) : (
            <div
              className="border rounded-xl divide-y overflow-hidden"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
              }}
            >
              {topThreeRecs.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 space-y-2.5 transition-colors hover:bg-[var(--cs-surface-hover)]"
                  style={{ borderColor: 'var(--cs-border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--cs-text)' }}>
                        {rec.title}
                      </div>
                      <div className="text-[11px] font-mono truncate mt-0.5" style={{ color: 'var(--cs-text-muted)' }}>
                        {rec.path}
                      </div>
                    </div>
                    <span
                      className="text-sm font-semibold font-mono tabular-nums shrink-0"
                      style={{ color: 'var(--cs-success)' }}
                    >
                      {formatBytes(rec.sizeBytes, unitMode)}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed line-clamp-1" style={{ color: 'var(--cs-text-secondary)' }}>
                    {rec.whyIdentified}
                  </p>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <RiskIndicator risk={rec.risk} compact />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectItem(rec.itemId)}
                        className="px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer"
                        style={{
                          backgroundColor: 'var(--cs-bg)',
                          borderColor: 'var(--cs-border)',
                          color: 'var(--cs-text-secondary)',
                        }}
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => onReviewRecommendation(rec)}
                        className="px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer"
                        style={{
                          backgroundColor: 'var(--cs-accent-muted)',
                          borderColor: 'var(--cs-border)',
                          color: 'var(--cs-accent)',
                        }}
                      >
                        Review cleanup
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Detected Ecosystems / Toolchain Footprint (5 cols) */}
        <section className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--cs-text)' }}>
              Detected Toolchains
            </h2>
            {scan.artifacts.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('artifacts')}
                className="inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
                style={{ color: 'var(--cs-accent)' }}
              >
                <span>View all ({scan.artifacts.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {ecosystemSummary.length === 0 ? (
            <div
              className="p-8 rounded-xl border text-center space-y-2"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
              }}
            >
              <Folder className="w-7 h-7 mx-auto text-[var(--cs-text-muted)]" />
              <div className="text-sm font-semibold" style={{ color: 'var(--cs-text)' }}>
                No developer artifacts
              </div>
              <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--cs-text-secondary)' }}>
                This folder does not contain common package managers or build directories.
              </p>
            </div>
          ) : (
            <div
              className="border rounded-xl divide-y overflow-hidden"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
              }}
            >
              {ecosystemSummary.map((eco) => (
                <div
                  key={eco.label}
                  onClick={() => onNavigate('artifacts')}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-[var(--cs-surface-hover)]"
                  style={{ borderColor: 'var(--cs-border-subtle)' }}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: 'var(--cs-text)' }}>
                      {eco.label}
                    </div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--cs-text-muted)' }}>
                      {eco.count} artifact{eco.count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span className="text-sm font-semibold font-mono tabular-nums shrink-0" style={{ color: 'var(--cs-text)' }}>
                    {formatBytes(eco.bytes, unitMode)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
