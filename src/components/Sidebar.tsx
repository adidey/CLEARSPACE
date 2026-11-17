import {
  BookOpen,
  Clock,
  FolderTree,
  HardDrive,
  Layers,
  LayoutGrid,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  NavSection,
  ScanResult,
  ScanStatus,
  StorageUnitMode,
} from '../types/storage';
import { formatBytes, formatRelativeTime } from '../utils/format';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currentScan: ScanResult;
  scanStatus: ScanStatus;
  unitMode: StorageUnitMode;
  recommendationCount: number;
  artifactCount: number;
}

interface NavItemConfig {
  id: NavSection;
  label: string;
  icon: typeof LayoutGrid;
  count?: number;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  currentScan,
  scanStatus,
  unitMode,
  recommendationCount,
  artifactCount,
}: SidebarProps) {
  const primaryNav: NavItemConfig[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'explorer', label: 'Storage Explorer', icon: FolderTree },
    {
      id: 'artifacts',
      label: 'Developer Artifacts',
      icon: Layers,
      count: artifactCount,
    },
    {
      id: 'recommendations',
      label: 'Cleanup Recommendations',
      icon: ShieldCheck,
      count: recommendationCount,
    },
    { id: 'history', label: 'Scan History', icon: Clock },
  ];

  const bottomNav: NavItemConfig[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Documentation', icon: BookOpen },
  ];

  const usedPercent =
    currentScan.totalCapacityBytes > 0
      ? Math.min(
          100,
          Math.round(
            (currentScan.usedBytes / currentScan.totalCapacityBytes) * 100
          )
        )
      : 0;

  return (
    <aside
      className="w-60 shrink-0 h-full flex flex-col justify-between border-r select-none"
      style={{
        backgroundColor: 'var(--cs-sidebar)',
        borderColor: 'var(--cs-border)',
      }}
    >
      <div>
        {/* Native macOS window chrome header + Brand mark */}
        <div
          className="px-4 pt-3.5 pb-3 border-b"
          style={{ borderColor: 'var(--cs-border-subtle)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E77E7E]/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E7B76D]/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#65C99A]/80" />
            </div>
            <span
              className="text-[11px] font-mono"
              style={{ color: 'var(--cs-text-muted)' }}
            >
              macOS · {currentScan.isMockData ? 'Demo' : 'Native'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: 'var(--cs-accent-muted)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-accent)',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1.5"
                  y="1.5"
                  width="7.5"
                  height="7.5"
                  rx="1.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <rect
                  x="10.5"
                  y="1.5"
                  width="4"
                  height="7.5"
                  rx="1"
                  fill="currentColor"
                  fillOpacity="0.4"
                />
                <rect
                  x="1.5"
                  y="10.5"
                  width="13"
                  height="4"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div
                className="text-sm font-semibold tracking-tight leading-none whitespace-nowrap"
                style={{ color: 'var(--cs-text)' }}
              >
                Clearspace
              </div>
              <div
                className="text-[11px] mt-1 truncate"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                Storage Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="p-2.5 space-y-0.5" aria-label="Primary Navigation">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-[13px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1"
                style={{
                  backgroundColor: isActive
                    ? 'var(--cs-surface-elevated)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--cs-text)'
                    : 'var(--cs-text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{
                      color: isActive
                        ? 'var(--cs-accent)'
                        : 'var(--cs-text-muted)',
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className="text-[11px] font-mono tabular-nums shrink-0"
                    style={{ color: 'var(--cs-text-muted)' }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Persistent Volume Status + Bottom Nav */}
      <div className="p-2.5 space-y-2.5">
        {/* Compact Persistent Storage & Scan Status */}
        <div
          className="p-3 rounded-lg border"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="flex items-center gap-1.5 text-xs font-medium truncate"
              style={{ color: 'var(--cs-text)' }}
            >
              <HardDrive
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: 'var(--cs-accent)' }}
              />
              <span className="truncate">{currentScan.rootItem?.name || currentScan.volumeName}</span>
            </span>
            <span
              className="text-[11px] font-mono tabular-nums shrink-0"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              {usedPercent}%
            </span>
          </div>

          <div
            className="w-full h-1.5 rounded-sm overflow-hidden mt-2"
            style={{ backgroundColor: 'var(--cs-surface-elevated)' }}
          >
            <div
              className="h-full transition-transform duration-200 origin-left"
              style={{
                backgroundColor:
                  usedPercent > 85 ? 'var(--cs-warning)' : 'var(--cs-accent)',
                transform: `scaleX(${usedPercent / 100})`,
              }}
            />
          </div>

          <div
            className="mt-2 flex items-center justify-between text-[11px] tabular-nums"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            <span>
              {formatBytes(currentScan.usedBytes, unitMode, 0)} of{' '}
              {formatBytes(currentScan.totalCapacityBytes, unitMode, 0)}
            </span>
            <span>
              {scanStatus === ScanStatus.Scanning
                ? 'Scanning…'
                : formatRelativeTime(
                    currentScan.scannedAt,
                    '2026-11-04T06:17:37Z'
                  )}
            </span>
          </div>

          <div
            className="mt-1.5 pt-1.5 border-t flex items-center justify-between text-[11px]"
            style={{
              borderColor: 'var(--cs-border-subtle)',
              color: 'var(--cs-text-muted)',
            }}
          >
            <span>State: {scanStatus === ScanStatus.Scanning ? 'Active' : 'Ready'}</span>
            <span style={{ color: currentScan.isMockData ? 'var(--cs-warning)' : 'var(--cs-success)' }}>
              {currentScan.isMockData ? 'Demo Data' : 'Native Disk'}
            </span>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div
          className="pt-2 border-t space-y-0.5"
          style={{ borderColor: 'var(--cs-border-subtle)' }}
        >
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive
                    ? 'var(--cs-surface-elevated)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--cs-text)'
                    : 'var(--cs-text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: isActive
                      ? 'var(--cs-accent)'
                      : 'var(--cs-text-muted)',
                  }}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
