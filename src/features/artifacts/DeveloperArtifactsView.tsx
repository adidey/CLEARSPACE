import { useMemo, useState } from 'react';
import { ArrowUpDown, Search, ShieldCheck } from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import {
  ArtifactEcosystem,
  DeveloperArtifact,
  RiskClassification,
  StorageUnitMode,
} from '../../types/storage';
import {
  ECOSYSTEM_LABELS,
  formatBytes,
  formatShortDate,
} from '../../utils/format';

interface DeveloperArtifactsViewProps {
  artifacts: DeveloperArtifact[];
  unitMode: StorageUnitMode;
  excludedFolders: string[];
  onInspectItemId: (itemId: string) => void;
}

type EcosystemTab = 'ALL' | ArtifactEcosystem;
type RiskFilter = 'ALL' | RiskClassification;

export function DeveloperArtifactsView({
  artifacts,
  unitMode,
  excludedFolders,
  onInspectItemId,
}: DeveloperArtifactsViewProps) {
  const [ecosystemTab, setEcosystemTab] = useState<EcosystemTab>('ALL');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'modified' | 'name'>('size');

  const ecosystemTabs: { id: EcosystemTab; label: string }[] = [
    { id: 'ALL', label: 'All Ecosystems' },
    { id: ArtifactEcosystem.NodeJS, label: 'Node.js' },
    { id: ArtifactEcosystem.Python, label: 'Python' },
    { id: ArtifactEcosystem.AppleDev, label: 'Apple Development' },
    { id: ArtifactEcosystem.Docker, label: 'Docker' },
    { id: ArtifactEcosystem.Other, label: 'Other (JVM, Rust, Go)' },
  ];

  const riskFilters: { id: RiskFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: RiskClassification.VerifiedSafe, label: 'Verified safe' },
    { id: RiskClassification.LowRisk, label: 'Low risk' },
    { id: RiskClassification.ReviewRequired, label: 'Review required' },
    { id: RiskClassification.HighRisk, label: 'High risk' },
  ];

  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return artifacts
      .filter((art) => {
        if (ecosystemTab !== 'ALL' && art.ecosystem !== ecosystemTab) {
          return false;
        }
        if (riskFilter !== 'ALL' && art.risk !== riskFilter) {
          return false;
        }
        if (q) {
          return (
            art.name.toLowerCase().includes(q) ||
            art.path.toLowerCase().includes(q) ||
            art.artifactType.toLowerCase().includes(q) ||
            (art.associatedProject &&
              art.associatedProject.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'size') return b.sizeBytes - a.sizeBytes;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
        );
      });
  }, [artifacts, ecosystemTab, riskFilter, searchQuery, sortBy]);

  const filteredTotalBytes = useMemo(
    () => filteredArtifacts.reduce((acc, item) => acc + item.sizeBytes, 0),
    [filteredArtifacts]
  );

  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-[1320px] mx-auto space-y-5">
      {/* Header & Methodology Note */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--cs-border)' }}>
        <div className="space-y-1">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Developer Artifact Detection
          </h1>
          <p
            className="text-xs max-w-2xl leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Artifacts are evaluated by lockfile presence, container mount graphs,
            and modification history — never classified safe by directory name
            alone.
          </p>
        </div>

        <div
          className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          <span>{filteredArtifacts.length} artifacts shown</span>
          <span aria-hidden="true">·</span>
          <span style={{ color: 'var(--cs-text)' }}>
            {formatBytes(filteredTotalBytes, unitMode)} total
          </span>
        </div>
      </div>

      {/* Category Ecosystem Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg border overflow-x-auto"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
      >
        {ecosystemTabs.map((tab) => {
          const active = ecosystemTab === tab.id;
          const count =
            tab.id === 'ALL'
              ? artifacts.length
              : artifacts.filter((a) => a.ecosystem === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEcosystemTab(tab.id)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: active
                  ? 'var(--cs-surface-elevated)'
                  : 'transparent',
                color: active ? 'var(--cs-text)' : 'var(--cs-text-secondary)',
              }}
            >
              <span>{tab.label}</span>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Risk Filter + Search + Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg border flex-wrap"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {riskFilters.map((rf) => {
            const active = riskFilter === rf.id;
            return (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRiskFilter(rf.id)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: active
                    ? 'var(--cs-surface-elevated)'
                    : 'transparent',
                  color: active ? 'var(--cs-text)' : 'var(--cs-text-secondary)',
                }}
              >
                {rf.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border w-full sm:w-64"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
            }}
          >
            <Search
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--cs-text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter project, path, or cache…"
              className="w-full bg-transparent text-xs focus:outline-none"
              style={{ color: 'var(--cs-text)' }}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setSortBy((prev) =>
                prev === 'size'
                  ? 'modified'
                  : prev === 'modified'
                  ? 'name'
                  : 'size'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text-secondary)',
            }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>
              Sort:{' '}
              {sortBy === 'size'
                ? 'Size'
                : sortBy === 'modified'
                ? 'Modified'
                : 'Name'}
            </span>
          </button>
        </div>
      </div>

      {/* Artifacts Table */}
      <div
        className="border rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
      >
        {filteredArtifacts.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-2">
            <ShieldCheck
              className="w-7 h-7 mx-auto"
              style={{ color: 'var(--cs-text-muted)' }}
            />
            <div
              className="text-sm font-medium"
              style={{ color: 'var(--cs-text)' }}
            >
              No developer artifacts match current filters
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              Reset ecosystem or risk filters to inspect all detected developer
              directories.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="border-b text-[11px]"
                  style={{
                    backgroundColor: 'var(--cs-sidebar)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text-muted)',
                  }}
                >
                  <th className="py-2.5 px-4 font-medium">Artifact & Path</th>
                  <th className="py-2.5 px-3 font-medium">Associated Project</th>
                  <th className="py-2.5 px-3 font-medium">Last Modified</th>
                  <th className="py-2.5 px-3 font-medium">Regenerability</th>
                  <th className="py-2.5 px-3 font-medium">Risk Classification</th>
                  <th className="py-2.5 px-4 font-medium text-right">Size</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                {filteredArtifacts.map((art) => {
                  const isExcluded = excludedFolders.includes(art.path);
                  return (
                    <tr
                      key={art.id}
                      onClick={() => onInspectItemId(art.itemId)}
                      className="transition-colors hover:bg-[var(--cs-surface-hover)] cursor-pointer"
                      style={{ borderColor: 'var(--cs-border-subtle)' }}
                    >
                      <td className="py-3 px-4 max-w-[330px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-semibold truncate"
                            style={{ color: 'var(--cs-text)' }}
                          >
                            {art.name}
                          </span>
                          <span
                            className="text-[11px] shrink-0"
                            style={{ color: 'var(--cs-text-muted)' }}
                          >
                            · {ECOSYSTEM_LABELS[art.ecosystem]}
                          </span>
                          {isExcluded && (
                            <span
                              className="text-[11px] shrink-0"
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
                          {art.path}
                        </div>
                      </td>

                      <td
                        className="py-3 px-3 font-mono whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {art.associatedProject ?? 'Global Cache'}
                      </td>

                      <td
                        className="py-3 px-3 font-mono tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {formatShortDate(art.lastModified)}
                      </td>

                      <td
                        className="py-3 px-3 whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {art.regenerability}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <RiskIndicator risk={art.risk} />
                      </td>

                      <td
                        className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text)' }}
                      >
                        {formatBytes(art.sizeBytes, unitMode)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
