import { Radar, Search } from 'lucide-react';
import { NavSection, ScanResult } from '../types/storage';

interface TopHeaderProps {
  activeSection: NavSection;
  currentScan: ScanResult;
  onOpenQuickSearch: () => void;
  onStartScan: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Overview',
  explorer: 'Storage Explorer',
  artifacts: 'Developer Artifacts',
  recommendations: 'Cleanup Recommendations',
  history: 'Scan History',
  settings: 'Settings',
  help: 'Help & Documentation',
};

export function TopHeader({
  activeSection,
  currentScan,
  onOpenQuickSearch,
  onStartScan,
}: TopHeaderProps) {
  return (
    <header
      className="h-13 shrink-0 px-6 border-b flex items-center justify-between gap-8"
      style={{
        backgroundColor: 'var(--cs-bg)',
        borderColor: 'var(--cs-border)',
      }}
    >
      {/* Zone 1: Current section title */}
      <div className="flex items-center gap-2 text-sm whitespace-nowrap shrink-0">
        <span
          className="font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          {SECTION_TITLES[activeSection]}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--cs-text-muted)' }}>
          /
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          {currentScan.volumeName}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--cs-text-muted)' }}>
          ·
        </span>
        <span
          className="text-xs"
          style={{ color: currentScan.isMockData ? 'var(--cs-warning)' : 'var(--cs-success)' }}
          title={currentScan.dataSourceLabel}
        >
          {currentScan.isMockData ? 'Demo Dataset' : 'Native Disk'}
        </span>
      </div>

      {/* Zone 2: Quick Search Trigger */}
      <button
        type="button"
        onClick={onOpenQuickSearch}
        className="hidden md:flex items-center justify-between gap-6 px-3 py-1.5 rounded-md border text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 min-w-64"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
          color: 'var(--cs-text-secondary)',
        }}
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>Jump to folder or artifact…</span>
        </span>
        <kbd
          className="font-mono text-[11px]"
          style={{ color: 'var(--cs-text-muted)' }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onStartScan}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--cs-accent)',
            color: '#111214',
          }}
        >
          <Radar className="w-3.5 h-3.5 shrink-0" />
          <span>Scan Storage</span>
        </button>
      </div>
    </header>
  );
}
