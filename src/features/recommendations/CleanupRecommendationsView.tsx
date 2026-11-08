import { useMemo, useState } from 'react';
import { EyeOff, FileSearch, Terminal } from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import {
  CleanupRecommendation,
  RiskClassification,
  StorageUnitMode,
} from '../../types/storage';
import { formatBytes, RISK_META } from '../../utils/format';

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
  const [hideExcluded, setHideExcluded] = useState<boolean>(false);

  const visibleRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      if (filter !== 'ALL' && rec.risk !== filter) return false;
      if (hideExcluded && excludedFolders.includes(rec.path)) return false;
      return true;
    });
  }, [recommendations, filter, hideExcluded, excludedFolders]);

  const tierSummaries = useMemo(() => {
    return (
      [
        RiskClassification.VerifiedSafe,
        RiskClassification.LowRisk,
        RiskClassification.ReviewRequired,
        RiskClassification.HighRisk,
      ] as const
    ).map((tier) => {
      const items = recommendations.filter((r) => r.risk === tier);
      const bytes = items.reduce((sum, r) => sum + r.sizeBytes, 0);
      return {
        tier,
        meta: RISK_META[tier],
        count: items.length,
        bytes,
      };
    });
  }, [recommendations]);

  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-[1320px] mx-auto space-y-6">
      {/* Header */}
      <div
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <div className="space-y-1">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Cleanup Recommendations
          </h1>
          <p
            className="text-xs max-w-2xl leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Understand before you delete. Each item details why it was
            identified, active process checks, deletion consequences, and exact
            restoration commands — without arbitrary safety percentages.
          </p>
        </div>

        <label
          className="inline-flex items-center gap-2 text-xs cursor-pointer select-none shrink-0"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          <input
            type="checkbox"
            checked={hideExcluded}
            onChange={(e) => setHideExcluded(e.target.checked)}
            className="rounded border accent-[#A6B8FF]"
          />
          <span>Hide excluded paths ({excludedFolders.length})</span>
        </label>
      </div>

      {/* Four Risk Classification Cards / Interactive Filter Strip */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border rounded-lg divide-y sm:divide-y-0 sm:divide-x"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
      >
        {tierSummaries.map(({ tier, meta, count, bytes }) => {
          const isSelected = filter === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setFilter(isSelected ? 'ALL' : tier)}
              className="p-4 text-left transition-colors cursor-pointer space-y-1.5"
              style={{
                borderColor: 'var(--cs-border)',
                backgroundColor: isSelected
                  ? 'var(--cs-surface-elevated)'
                  : 'transparent',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <RiskIndicator risk={tier} />
                <span
                  className="text-[11px] font-mono tabular-nums"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div
                className="text-lg font-semibold font-mono tabular-nums"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatBytes(bytes, unitMode)}
              </div>
              <p
                className="text-[11px] leading-snug"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter Segmented Bar */}
      <div className="flex items-center justify-between gap-4">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg border flex-wrap"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {(
            [
              { id: 'ALL', label: 'All Classifications' },
              { id: RiskClassification.VerifiedSafe, label: 'Verified Safe' },
              { id: RiskClassification.LowRisk, label: 'Low Risk' },
              {
                id: RiskClassification.ReviewRequired,
                label: 'Review Required',
              },
              { id: RiskClassification.HighRisk, label: 'High Risk' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: active
                    ? 'var(--cs-surface-elevated)'
                    : 'transparent',
                  color: active ? 'var(--cs-text)' : 'var(--cs-text-secondary)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--cs-text-muted)' }}
        >
          Showing {visibleRecommendations.length} of {recommendations.length}
        </span>
      </div>

      {/* Detailed Recommendation Intelligence List */}
      <div className="space-y-3">
        {visibleRecommendations.map((rec) => {
          const isExcluded = excludedFolders.includes(rec.path);
          return (
            <article
              key={rec.id}
              className="p-5 rounded-lg border space-y-4 transition-colors"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                opacity: isExcluded ? 0.65 : 1,
              }}
            >
              {/* Top Row: Title, Path, Classification & Size */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <RiskIndicator risk={rec.risk} />
                    <span
                      aria-hidden="true"
                      style={{ color: 'var(--cs-text-muted)' }}
                    >
                      ·
                    </span>
                    <span style={{ color: 'var(--cs-text-secondary)' }}>
                      {rec.regenerabilityLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{ color: 'var(--cs-text-muted)' }}
                    >
                      ·
                    </span>
                    <span
                      className="font-mono tabular-nums"
                      style={{ color: 'var(--cs-text-muted)' }}
                    >
                      {rec.lastAccessedDaysAgo === 0
                        ? 'Modified today'
                        : `Idle ${rec.lastAccessedDaysAgo}d`}
                    </span>
                    {isExcluded && (
                      <>
                        <span
                          aria-hidden="true"
                          style={{ color: 'var(--cs-text-muted)' }}
                        >
                          ·
                        </span>
                        <span style={{ color: 'var(--cs-warning)' }}>
                          Excluded from scans
                        </span>
                      </>
                    )}
                  </div>

                  <h2
                    className="text-base font-semibold tracking-tight"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    {rec.title}
                  </h2>

                  <div
                    className="text-xs font-mono break-all"
                    style={{ color: 'var(--cs-text-muted)' }}
                  >
                    {rec.path}
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div
                    className="text-xl font-semibold font-mono tabular-nums"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    {formatBytes(rec.sizeBytes, unitMode)}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: 'var(--cs-text-muted)' }}
                  >
                    {rec.category}
                  </div>
                </div>
              </div>

              {/* Structured 3-Column Explanation Grid */}
              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-3.5 border-t text-xs"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                <div className="space-y-1">
                  <div
                    className="font-semibold"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    What it is & why identified
                  </div>
                  <p
                    className="leading-relaxed"
                    style={{ color: 'var(--cs-text-secondary)' }}
                  >
                    {rec.whatItIs} {rec.whyIdentified}
                  </p>
                  <div
                    className="text-[11px] font-mono pt-0.5"
                    style={{ color: 'var(--cs-text-muted)' }}
                  >
                    Detected: {rec.detectedMarkers.join(' · ')}
                  </div>
                </div>

                <div className="space-y-1">
                  <div
                    className="font-semibold"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    What happens if deleted
                  </div>
                  <p
                    className="leading-relaxed"
                    style={{ color: 'var(--cs-text-secondary)' }}
                  >
                    {rec.deletionConsequence}
                  </p>
                  <div
                    className="text-[11px] pt-0.5"
                    style={{
                      color: rec.activeDependenciesDetected
                        ? 'var(--cs-warning)'
                        : 'var(--cs-text-muted)',
                    }}
                  >
                    Dependencies: {rec.activeDependencyNote}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div
                    className="font-semibold"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    How to restore
                  </div>
                  <p
                    className="leading-relaxed"
                    style={{ color: 'var(--cs-text-secondary)' }}
                  >
                    {rec.restorationSteps}
                  </p>
                  {rec.recoveryCommand && (
                    <div
                      className="px-2.5 py-1.5 rounded border font-mono text-[11px] flex items-center gap-2 truncate"
                      style={{
                        backgroundColor: 'var(--cs-bg)',
                        borderColor: 'var(--cs-border)',
                        color: 'var(--cs-accent)',
                      }}
                    >
                      <Terminal className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{rec.recoveryCommand}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div
                className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                <div
                  className="text-[11px]"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  Artifact: <span className="font-mono">{rec.artifactName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectItem(rec.itemId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--cs-bg)',
                      borderColor: 'var(--cs-border)',
                      color: 'var(--cs-text)',
                    }}
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleExclude(rec.path)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: isExcluded
                        ? 'var(--cs-accent-muted)'
                        : 'var(--cs-bg)',
                      borderColor: 'var(--cs-border)',
                      color: isExcluded
                        ? 'var(--cs-accent)'
                        : 'var(--cs-text-secondary)',
                    }}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{isExcluded ? 'Excluded' : 'Exclude'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onReviewCleanup(rec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--cs-accent-muted)',
                      borderColor: 'var(--cs-border)',
                      color: 'var(--cs-accent)',
                    }}
                  >
                    <span>Review cleanup</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
