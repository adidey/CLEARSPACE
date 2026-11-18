import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FolderArchive,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import {
  CleanupRecommendation,
  RiskClassification,
  StorageUnitMode,
} from '../../types/storage';
import { formatBytes } from '../../utils/format';

interface CleanupRecommendationsViewProps {
  recommendations: CleanupRecommendation[];
  unitMode: StorageUnitMode;
  excludedFolders: string[];
  onInspectItem: (itemId: string) => void;
  onToggleExclude: (path: string) => void;
  onReviewCleanup: (rec: CleanupRecommendation) => void;
}

type ClassificationFilter = 'ALL' | RiskClassification;

export function CleanupRecommendationsView({
  recommendations,
  unitMode,
  excludedFolders,
  onInspectItem,
  onToggleExclude,
  onReviewCleanup,
}: CleanupRecommendationsViewProps) {
  const [filter, setFilter] = useState<ClassificationFilter>('ALL');

  const safeRecommendations = useMemo(() => {
    return recommendations.filter((r) => r.risk === RiskClassification.VerifiedSafe);
  }, [recommendations]);

  const totalSafeBytes = useMemo(() => {
    return safeRecommendations.reduce((acc, r) => acc + r.sizeBytes, 0);
  }, [safeRecommendations]);

  const visibleRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      if (filter !== 'ALL' && rec.risk !== filter) return false;
      return true;
    });
  }, [recommendations, filter]);

  return (
    <div className="p-6 lg:px-10 lg:py-8 max-w-[1240px] mx-auto space-y-7 select-none">
      {/* 1. Clean Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--cs-border)' }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--cs-text)' }}>
            Cleanup Recommendations
          </h1>
          <p className="text-xs max-w-xl leading-relaxed" style={{ color: 'var(--cs-text-secondary)' }}>
            Only verified build outputs and locked dependency trees are marked safe. Every item can be restored via macOS Trash or rebuilt via CLI.
          </p>
        </div>

        {/* Essential Metric Pill */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border shrink-0"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: totalSafeBytes > 0 ? 'rgba(101, 201, 154, 0.3)' : 'var(--cs-border)',
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(101, 201, 154, 0.12)' }}>
            <ShieldCheck className="w-4.5 h-4.5 text-[var(--cs-success)]" />
          </div>
          <div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--cs-text-muted)' }}>
              Verified Safe to Reclaim
            </div>
            <div className="text-base font-semibold font-mono tabular-nums" style={{ color: totalSafeBytes > 0 ? 'var(--cs-success)' : 'var(--cs-text)' }}>
              {formatBytes(totalSafeBytes, unitMode)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Streamlined Single Filter Bar (No duplicate grids!) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'ALL', label: 'All Items', count: recommendations.length },
            {
              id: RiskClassification.VerifiedSafe,
              label: 'Verified Safe',
              count: recommendations.filter((r) => r.risk === RiskClassification.VerifiedSafe).length,
            },
            {
              id: RiskClassification.LowRisk,
              label: 'Low Risk',
              count: recommendations.filter((r) => r.risk === RiskClassification.LowRisk).length,
            },
            {
              id: RiskClassification.ReviewRequired,
              label: 'Review Required',
              count: recommendations.filter((r) => r.risk === RiskClassification.ReviewRequired).length,
            },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: active ? 'var(--cs-surface-elevated)' : 'var(--cs-surface)',
                border: `1px solid ${active ? 'var(--cs-accent)' : 'var(--cs-border)'}`,
                color: active ? 'var(--cs-text)' : 'var(--cs-text-secondary)',
              }}
            >
              <span>{tab.label}</span>
              <span
                className="px-1.5 py-0.2 rounded-md font-mono text-[10px]"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  color: 'var(--cs-text-muted)',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Empty State or Clear Recommendation Cards */}
      {visibleRecommendations.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-3"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <CheckCircle2 className="w-8 h-8 mx-auto text-[var(--cs-success)] opacity-80" />
          <div className="text-base font-semibold" style={{ color: 'var(--cs-text)' }}>
            No cleanups needed in this view
          </div>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--cs-text-secondary)' }}>
            All discovered files are active project essentials.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {visibleRecommendations.map((rec) => {
            const isSafe = rec.risk === RiskClassification.VerifiedSafe;
            return (
              <div
                key={rec.id}
                className="p-5 rounded-xl border transition-all hover:border-[var(--cs-border-subtle)] space-y-3.5"
                style={{
                  backgroundColor: 'var(--cs-surface)',
                  borderColor: isSafe ? 'rgba(101, 201, 154, 0.2)' : 'var(--cs-border)',
                }}
              >
                {/* Header row: Title, badge, and size */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isSafe ? 'rgba(101, 201, 154, 0.1)' : 'var(--cs-bg)',
                      }}
                    >
                      <FolderArchive className="w-4 h-4" style={{ color: isSafe ? 'var(--cs-success)' : 'var(--cs-accent)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--cs-text)' }}>
                        {rec.title}
                      </div>
                      <div className="text-[11px] font-mono truncate text-[var(--cs-text-muted)]">
                        {rec.path}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <RiskIndicator risk={rec.risk} compact />
                    <span
                      className="text-base font-semibold font-mono tabular-nums"
                      style={{ color: isSafe ? 'var(--cs-success)' : 'var(--cs-text)' }}
                    >
                      {formatBytes(rec.sizeBytes, unitMode)}
                    </span>
                  </div>
                </div>

                {/* Evidence & Logic Explanation: Simple & Concise */}
                <div
                  className="p-3 rounded-lg border text-xs space-y-1.5"
                  style={{
                    backgroundColor: 'var(--cs-bg)',
                    borderColor: 'var(--cs-border-subtle)',
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-[11px] text-[var(--cs-text-secondary)] uppercase tracking-wider shrink-0">
                      Why safe:
                    </span>
                    <span className="text-[var(--cs-text)] text-xs leading-relaxed">
                      {rec.whyIdentified}
                    </span>
                  </div>

                  {rec.recoveryCommand && (
                    <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-[var(--cs-text-muted)]">
                      <Terminal className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[var(--cs-accent)] truncate">
                        {rec.recoveryCommand}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onInspectItem(rec.itemId)}
                    className="text-xs font-medium text-[var(--cs-text-secondary)] hover:text-[var(--cs-text)] cursor-pointer"
                  >
                    Inspect details →
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleExclude(rec.path)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium text-[var(--cs-text-secondary)] hover:text-[var(--cs-text)] cursor-pointer"
                      style={{
                        backgroundColor: 'var(--cs-surface)',
                        borderColor: 'var(--cs-border)',
                      }}
                    >
                      Exclude
                    </button>

                    <button
                      type="button"
                      onClick={() => onReviewCleanup(rec)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: isSafe ? 'var(--cs-success)' : 'var(--cs-accent)',
                        color: '#111214',
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clean to Trash</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
