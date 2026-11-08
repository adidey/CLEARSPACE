import { Check, Clock, HardDrive, Radar } from 'lucide-react';
import { NavSection, ScanResult, StorageUnitMode } from '../../types/storage';
import { formatBytes, formatDateTime } from '../../utils/format';

interface ScanHistoryViewProps {
  history: ScanResult[];
  activeScanId: string;
  unitMode: StorageUnitMode;
  onSelectSnapshot: (snapshotId: string) => void;
  onNavigate: (section: NavSection) => void;
  onStartNewScan: () => void;
}

export function ScanHistoryView({
  history,
  activeScanId,
  unitMode,
  onSelectSnapshot,
  onNavigate,
  onStartNewScan,
}: ScanHistoryViewProps) {
  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-[1320px] mx-auto space-y-6">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <div className="space-y-1">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Scan History
          </h1>
          <p
            className="text-xs max-w-2xl leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Compare historical storage snapshots to observe how Docker caches,
            Xcode DerivedData, and project dependencies grow over time. All
            snapshots are stored locally on your Mac via SQLite.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewScan}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--cs-accent)',
            color: '#111214',
          }}
        >
          <Radar className="w-3.5 h-3.5" />
          <span>Scan Storage</span>
        </button>
      </div>

      {/* History Table */}
      <div
        className="border rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
      >
        {history.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock
              className="w-7 h-7 mx-auto"
              style={{ color: 'var(--cs-text-muted)' }}
            />
            <div
              className="text-sm font-medium"
              style={{ color: 'var(--cs-text)' }}
            >
              No previous scan snapshots
            </div>
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
                  <th className="py-3 px-4 font-medium">Scan Date & Target</th>
                  <th className="py-3 px-3 font-medium">Storage Analysed</th>
                  <th className="py-3 px-3 font-medium">Largest Directory</th>
                  <th className="py-3 px-3 font-medium">Potential Recovery</th>
                  <th className="py-3 px-3 font-medium">Duration</th>
                  <th className="py-3 px-4 font-medium text-right">Snapshot</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                {history.map((entry) => {
                  const isActive = entry.id === activeScanId;
                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-[var(--cs-surface-hover)]"
                      style={{
                        borderColor: 'var(--cs-border-subtle)',
                        backgroundColor: isActive
                          ? 'var(--cs-surface-elevated)'
                          : 'transparent',
                      }}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <HardDrive
                            className="w-3.5 h-3.5 shrink-0"
                            style={{
                              color: isActive
                                ? 'var(--cs-accent)'
                                : 'var(--cs-text-muted)',
                            }}
                          />
                          <span
                            className="font-semibold font-mono tabular-nums"
                            style={{ color: 'var(--cs-text)' }}
                          >
                            {formatDateTime(entry.scannedAt)}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{
                              color: entry.isMockData
                                ? 'var(--cs-warning)'
                                : 'var(--cs-success)',
                            }}
                          >
                            · {entry.isMockData ? 'Demo' : 'Native'}
                          </span>
                        </div>
                        <div
                          className="text-[11px] font-mono mt-0.5 pl-5.5"
                          style={{ color: 'var(--cs-text-muted)' }}
                        >
                          {entry.volumeName} ({entry.mountPoint})
                        </div>
                      </td>

                      <td
                        className="py-3.5 px-3 font-mono font-medium tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text)' }}
                      >
                        {formatBytes(entry.usedBytes, unitMode)}
                        <span
                          className="text-[11px] font-normal ml-1"
                          style={{ color: 'var(--cs-text-muted)' }}
                        >
                          / {formatBytes(entry.totalCapacityBytes, unitMode, 0)}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-3 font-mono whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {entry.largestDirectoryPath}
                      </td>

                      <td
                        className="py-3.5 px-3 font-mono font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-success)' }}
                      >
                        {formatBytes(entry.recoverableBytes, unitMode)}
                      </td>

                      <td
                        className="py-3.5 px-3 font-mono tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {entry.scanDurationSeconds.toFixed(1)}s
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isActive ? (
                          <div className="inline-flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium"
                              style={{ color: 'var(--cs-accent)' }}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onNavigate('overview')}
                              className="px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer"
                              style={{
                                backgroundColor: 'var(--cs-bg)',
                                borderColor: 'var(--cs-border)',
                                color: 'var(--cs-text)',
                              }}
                            >
                              Inspect Overview
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectSnapshot(entry.id)}
                            className="px-3 py-1 rounded border text-xs font-medium cursor-pointer"
                            style={{
                              backgroundColor: 'var(--cs-bg)',
                              borderColor: 'var(--cs-border)',
                              color: 'var(--cs-text)',
                            }}
                          >
                            Load Snapshot
                          </button>
                        )}
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
