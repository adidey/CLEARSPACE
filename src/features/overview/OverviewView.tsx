import { useState } from 'react';
import {
  ArrowRight,
  FolderOpen,
  HardDrive,
  Radar,
  RotateCcw,
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

  // Handle empty scan state gracefully
  if (scan.usedBytes === 0 || scan.categories.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div
          className="p-10 rounded-xl border text-center space-y-4"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <HardDrive
            className="w-8 h-8 mx-auto"
            style={{ color: 'var(--cs-text-muted)' }}
          />
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Empty Directory Analysed
          </h1>
          <p
            className="text-sm max-w-md mx-auto leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Target directory <code className="font-mono">{scan.mountPoint}</code>{' '}
            contains 0 bytes of indexed files or developer build artifacts.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRestoreDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--cs-accent)',
                color: '#111214',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Macintosh HD Demo Dataset</span>
            </button>
            <button
              type="button"
              onClick={onStartScan}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Configure Scan</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usedPercent = (scan.usedBytes / scan.totalCapacityBytes) * 100;
  const availablePercent =
    (scan.availableBytes / scan.totalCapacityBytes) * 100;
  const topThreeRecs = scan.recommendations.slice(0, 3);

  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-[1320px] mx-auto space-y-7">
      {/* Hero / Top Section */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b" style={{ borderColor: 'var(--cs-border)' }}>
        <div className="space-y-1.5">
          <div
            className="text-xs flex items-center gap-2"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            <span>{scan.volumeName}</span>
            <span aria-hidden="true">·</span>
            <span>{scan.volumeFormat}</span>
            <span aria-hidden="true">·</span>
            <span style={{ color: scan.isMockData ? 'var(--cs-warning)' : 'var(--cs-success)' }}>
              {scan.isMockData ? 'Demo Dataset (MockFilesystemProvider)' : scan.dataSourceLabel}
            </span>
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)', textWrap: 'balance' }}
          >
            Your storage, understood.
          </h1>
          <p
            className="text-xs max-w-2xl leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Inspect local developer caches, toolchains, and build artifacts
            with lockfile and dependency evidence before deciding what to clean.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('explorer')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text)',
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Treemap</span>
          </button>
          <button
            type="button"
            onClick={onStartScan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--cs-accent)',
              color: '#111214',
            }}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Scan Storage</span>
          </button>
        </div>
      </section>

      {/* Four Key Metrics */}
      <section
        aria-label="Storage Capacity Metrics"
        className="grid grid-cols-2 lg:grid-cols-4 border rounded-lg divide-y lg:divide-y-0 lg:divide-x"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
      >
        <div className="p-4 space-y-1" style={{ borderColor: 'var(--cs-border)' }}>
          <div
            className="text-xs"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Total disk capacity
          </div>
          <div
            className="text-2xl font-semibold font-mono tabular-nums tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            {formatBytes(scan.totalCapacityBytes, unitMode)}
          </div>
          <div
            className="text-[11px]"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            Internal NVMe · {scan.mountPoint}
          </div>
        </div>

        <div className="p-4 space-y-1" style={{ borderColor: 'var(--cs-border)' }}>
          <div
            className="text-xs"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Used storage
          </div>
          <div
            className="text-2xl font-semibold font-mono tabular-nums tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            {formatBytes(scan.usedBytes, unitMode)}
          </div>
          <div
            className="text-[11px] tabular-nums"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            {formatPercent(usedPercent)} of volume utilised
          </div>
        </div>

        <div className="p-4 space-y-1" style={{ borderColor: 'var(--cs-border)' }}>
          <div
            className="text-xs"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Available storage
          </div>
          <div
            className="text-2xl font-semibold font-mono tabular-nums tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            {formatBytes(scan.availableBytes, unitMode)}
          </div>
          <div
            className="text-[11px] tabular-nums"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            {formatPercent(availablePercent)} free headroom
          </div>
        </div>

        <div className="p-4 space-y-1" style={{ borderColor: 'var(--cs-border)' }}>
          <div
            className="text-xs"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Potentially recoverable
          </div>
          <div
            className="text-2xl font-semibold font-mono tabular-nums tracking-tight"
            style={{ color: 'var(--cs-success)' }}
          >
            {formatBytes(scan.recoverableBytes, unitMode)}
          </div>
          <div
            className="text-[11px]"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            Verified safe & low-risk developer caches
          </div>
        </div>
      </section>

      {/* Where Your Storage Goes + Horizontal Utilisation Bar */}
      <section className="space-y-3.5">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Where your storage goes
          </h2>
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            {hoveredCategory
              ? `${hoveredCategory}: ${formatBytes(
                  scan.categories.find((c) => c.category === hoveredCategory)
                    ?.sizeBytes ?? 0,
                  unitMode
                )}`
              : `${formatBytes(scan.usedBytes, unitMode)} allocated · ${formatBytes(
                  scan.availableBytes,
                  unitMode
                )} free`}
          </span>
        </div>

        {/* Horizontal Segmented Utilisation Bar */}
        <div
          className="h-4 w-full rounded-md overflow-hidden flex border p-0.5 gap-0.5"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
          role="img"
          aria-label="Horizontal storage utilisation breakdown"
        >
          {scan.categories.map((cat) => {
            const color = CATEGORY_COLOR_MAP[cat.category];
            const isDimmed =
              hoveredCategory !== null && hoveredCategory !== cat.category;
            return (
              <button
                key={cat.category}
                type="button"
                onMouseEnter={() => setHoveredCategory(cat.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => onNavigate('explorer')}
                className="h-full first:rounded-l-xs transition-opacity duration-150 cursor-pointer"
                style={{
                  width: `${cat.percentageOfTotal}%`,
                  backgroundColor: color.hex,
                  opacity: isDimmed ? 0.32 : 1,
                }}
                title={`${cat.category}: ${formatBytes(
                  cat.sizeBytes,
                  unitMode
                )} (${formatPercent(cat.percentageOfTotal)} of disk)`}
              />
            );
          })}
          <div
            className="h-full flex-1 rounded-r-xs"
            style={{ backgroundColor: 'var(--cs-bg)' }}
            title={`Available: ${formatBytes(scan.availableBytes, unitMode)}`}
          />
        </div>

        {/* Category Breakdown Grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border rounded-lg divide-y md:divide-y-0 md:divide-x"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {scan.categories.map((cat) => {
            const color = CATEGORY_COLOR_MAP[cat.category];
            const isHighlighted = hoveredCategory === cat.category;
            return (
              <button
                key={cat.category}
                type="button"
                onMouseEnter={() => setHoveredCategory(cat.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() =>
                  onNavigate(
                    cat.category === StorageCategory.DeveloperFiles
                      ? 'artifacts'
                      : 'explorer'
                  )
                }
                className="p-3.5 text-left transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--cs-border)',
                  backgroundColor: isHighlighted
                    ? 'var(--cs-surface-hover)'
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span
                    className="truncate"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    {cat.category}
                  </span>
                </div>
                <div
                  className="mt-2 text-sm font-semibold font-mono tabular-nums"
                  style={{ color: 'var(--cs-text)' }}
                >
                  {formatBytes(cat.sizeBytes, unitMode)}
                </div>
                <div
                  className="mt-0.5 text-[11px] font-mono tabular-nums"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  {formatPercent(cat.percentageOfUsed)} of used
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Two-Column Split: Biggest Storage Consumers & Recommended Cleanups */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Your biggest storage consumers (7 cols) */}
        <section className="xl:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--cs-text)' }}
            >
              Your biggest storage consumers
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('explorer')}
              className="inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
              style={{ color: 'var(--cs-accent)' }}
            >
              <span>Explore all directories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="border rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
            }}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="border-b text-[11px]"
                  style={{
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text-muted)',
                  }}
                >
                  <th className="py-2.5 px-4 font-medium">Name & Location</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Risk Level</th>
                  <th className="py-2.5 px-4 font-medium text-right">Size</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                {scan.topConsumers.slice(0, 5).map((item) => {
                  const isExcluded = excludedFolders.includes(item.path);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onInspectItem(item)}
                      className="transition-colors hover:bg-[var(--cs-surface-hover)] cursor-pointer"
                      style={{ borderColor: 'var(--cs-border-subtle)' }}
                    >
                      <td className="py-2.5 px-4 max-w-[260px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium truncate"
                            style={{ color: 'var(--cs-text)' }}
                          >
                            {item.name}
                          </span>
                          {isExcluded && (
                            <span
                              className="text-[11px]"
                              style={{ color: 'var(--cs-warning)' }}
                            >
                              · Excluded
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[11px] font-mono truncate mt-0.5"
                          style={{ color: 'var(--cs-text-muted)' }}
                        >
                          {item.path}
                        </div>
                      </td>
                      <td
                        className="py-2.5 px-3 whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {item.category}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <RiskIndicator risk={item.risk} compact />
                      </td>
                      <td
                        className="py-2.5 px-4 text-right font-mono font-medium tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text)' }}
                      >
                        {formatBytes(item.sizeBytes, unitMode)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recommended cleanups (5 cols) */}
        <section className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--cs-text)' }}
            >
              Recommended cleanups
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('recommendations')}
              className="inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
              style={{ color: 'var(--cs-accent)' }}
            >
              <span>View all ({scan.recommendations.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="border rounded-lg divide-y"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
            }}
          >
            {topThreeRecs.map((rec) => (
              <div
                key={rec.id}
                className="p-4 space-y-2.5"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-xs font-semibold truncate"
                      style={{ color: 'var(--cs-text)' }}
                    >
                      {rec.title}
                    </div>
                    <div
                      className="text-[11px] font-mono truncate mt-0.5"
                      style={{ color: 'var(--cs-text-muted)' }}
                    >
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

                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: 'var(--cs-text-secondary)' }}
                >
                  {rec.whyIdentified}
                </p>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <RiskIndicator risk={rec.risk} compact />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectItem(rec.itemId)}
                      className="px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer whitespace-nowrap"
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
                      className="px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer whitespace-nowrap"
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
        </section>
      </div>

      {/* Developer Ecosystem Footprint Summary Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Developer toolchain footprint
          </h2>
          <button
            type="button"
            onClick={() => onExploreDirectory('dir-projects')}
            className="text-xs font-medium cursor-pointer"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Jump to ~/Projects in Explorer →
          </button>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border rounded-lg divide-y sm:divide-y-0 sm:divide-x text-xs"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {[
            { label: 'Docker VM & Cache', bytes: 32.1e9, sub: '19.4 GB prunable' },
            { label: 'Xcode & Simulators', bytes: 21.6e9, sub: 'DerivedData 11.4 GB' },
            { label: 'Node.js & Stores', bytes: 18.4e9, sub: '3 node_modules + stores' },
            { label: 'Gradle & Android', bytes: 7.2e9, sub: 'Caches & API 33 image' },
            { label: 'Python Virtualenvs', bytes: 4.8e9, sub: '2 .venv environments' },
            { label: 'Package Caches', bytes: 3.6e9, sub: 'pip, Poetry, Go' },
          ].map((tool) => (
            <button
              key={tool.label}
              type="button"
              onClick={() => onNavigate('artifacts')}
              className="p-3.5 text-left transition-colors hover:bg-[var(--cs-surface-hover)] cursor-pointer"
              style={{ borderColor: 'var(--cs-border)' }}
            >
              <div
                className="font-medium truncate"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {tool.label}
              </div>
              <div
                className="text-base font-semibold font-mono tabular-nums mt-1"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatBytes(tool.bytes, unitMode)}
              </div>
              <div
                className="text-[11px] mt-0.5 truncate"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                {tool.sub}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
