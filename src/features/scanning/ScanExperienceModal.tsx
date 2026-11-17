import {
  AlertOctagon,
  CheckCircle2,
  FolderSearch,
  HardDrive,
  Radar,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ScanSimulationScenario } from '../../services/filesystem/types';
import {
  ScanProgress,
  ScanStatus,
  StorageUnitMode,
} from '../../types/storage';
import { formatBytes, formatNumber } from '../../utils/format';

interface ScanExperienceModalProps {
  isOpen: boolean;
  progress: ScanProgress;
  scenario: ScanSimulationScenario;
  unitMode: StorageUnitMode;
  onChangeScenario: (scenario: ScanSimulationScenario) => void;
  onStartScan: (scenario: ScanSimulationScenario) => void;
  onCancelScan: () => void;
  onCloseCompleted: () => void;
  isNative?: boolean;
  onSelectFolder?: () => void;
}

export function ScanExperienceModal({
  isOpen,
  progress,
  scenario,
  unitMode,
  onChangeScenario,
  onStartScan,
  onCancelScan,
  onCloseCompleted,
  isNative = false,
  onSelectFolder,
}: ScanExperienceModalProps) {
  if (!isOpen) return null;

  const isScanning = progress.status === ScanStatus.Scanning;
  const isCompleted = progress.status === ScanStatus.Completed;
  const isPermissionDenied = progress.status === ScanStatus.PermissionDenied;
  const isFailed = progress.status === ScanStatus.Failed;
  const isEmpty = progress.status === ScanStatus.Empty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-modal-title"
        className="w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--cs-sidebar)',
          borderColor: 'var(--cs-border)',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between gap-4"
          style={{ borderColor: 'var(--cs-border)' }}
        >
          <div className="space-y-0.5">
            <div
              className="text-[11px] font-mono flex items-center gap-2"
              style={{ color: isNative ? 'var(--cs-success)' : 'var(--cs-warning)' }}
            >
              <span>{isNative ? 'NATIVE macOS SCANNER' : 'MOCK SCAN SIMULATION'}</span>
              <span aria-hidden="true" style={{ color: 'var(--cs-text-muted)' }}>
                ·
              </span>
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                {isNative
                  ? 'Direct APFS directory traversal via Rust'
                  : 'No real disk reads in browser preview'}
              </span>
            </div>
            <h2
              id="scan-modal-title"
              className="text-base font-semibold tracking-tight"
              style={{ color: 'var(--cs-text)' }}
            >
              {isScanning && 'Analysing Developer Storage…'}
              {isCompleted && (isNative ? 'Storage Scan Completed' : 'Demo Storage Scan Complete')}
              {isPermissionDenied && 'macOS Full Disk Access Required'}
              {isFailed && 'Filesystem Traversal Interrupted'}
              {isEmpty && 'Scan Completed — Empty Directory'}
              {progress.status === ScanStatus.Idle && 'Ready to Scan'}
            </h2>
          </div>

          {!isScanning && (
            <button
              type="button"
              onClick={onCloseCompleted}
              className="p-1 rounded-md cursor-pointer"
              style={{ color: 'var(--cs-text-secondary)' }}
              aria-label="Close scan dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Prototype State Simulator Switcher or Native Folder Picker */}
        <div
          className="px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-[11px]"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border-subtle)',
          }}
        >
          {isNative ? (
            <div className="w-full flex items-center justify-between gap-3">
              <span style={{ color: 'var(--cs-text-secondary)' }} className="truncate">
                Target: <code className="font-mono">{progress.targetDirectory || '~'}</code>
              </span>
              {onSelectFolder && !isScanning && (
                <button
                  type="button"
                  onClick={onSelectFolder}
                  className="px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--cs-surface)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-accent)',
                  }}
                >
                  Choose Folder…
                </button>
              )}
            </div>
          ) : (
            <>
              <span style={{ color: 'var(--cs-text-muted)' }}>
                Prototype state test:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { id: 'normal', label: 'Normal Scan' },
                    { id: 'permission-denied', label: 'Permission Denied' },
                    { id: 'failed', label: 'I/O Failure' },
                    { id: 'empty', label: 'Empty Folder' },
                  ] as const
                ).map((opt) => {
                  const active = scenario === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChangeScenario(opt.id);
                        onStartScan(opt.id);
                      }}
                      className="px-2 py-0.5 rounded border text-[11px] font-medium cursor-pointer whitespace-nowrap"
                      style={{
                        backgroundColor: active
                          ? 'var(--cs-surface-elevated)'
                          : 'transparent',
                        borderColor: active
                          ? 'var(--cs-border)'
                          : 'transparent',
                        color: active
                          ? 'var(--cs-text)'
                          : 'var(--cs-text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono tabular-nums">
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                {isScanning
                  ? 'Walking APFS directory tree…'
                  : isCompleted
                  ? 'Snapshot indexed'
                  : isEmpty
                  ? '0 files discovered'
                  : 'Halted at checkpoint'}
              </span>
              <span
                className="font-semibold"
                style={{
                  color:
                    isPermissionDenied || isFailed
                      ? 'var(--cs-danger)'
                      : isCompleted
                      ? 'var(--cs-success)'
                      : 'var(--cs-accent)',
                }}
              >
                {progress.percentComplete}%
              </span>
            </div>

            <div
              className="w-full h-2 rounded-sm overflow-hidden"
              style={{ backgroundColor: 'var(--cs-bg)' }}
            >
              <div
                className="h-full transition-transform duration-150 origin-left"
                style={{
                  backgroundColor:
                    isPermissionDenied || isFailed
                      ? 'var(--cs-danger)'
                      : isCompleted
                      ? 'var(--cs-success)'
                      : 'var(--cs-accent)',
                  transform: `scaleX(${progress.percentComplete / 100})`,
                }}
              />
            </div>
          </div>

          {/* Currently Scanned Directory */}
          <div
            className="p-3 rounded-lg border space-y-1"
            style={{
              backgroundColor: 'var(--cs-bg)',
              borderColor: 'var(--cs-border)',
            }}
          >
            <div
              className="text-[11px] flex items-center gap-1.5"
              style={{ color: 'var(--cs-text-muted)' }}
            >
              <FolderSearch className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isScanning ? 'Currently scanning' : 'Last inspected path'}
              </span>
            </div>
            <div
              className="font-mono text-xs truncate"
              style={{ color: 'var(--cs-text)' }}
            >
              {progress.currentDirectory}
            </div>
          </div>

          {/* Live Counters */}
          <div
            className="grid grid-cols-3 border rounded-lg divide-x"
            style={{
              backgroundColor: 'var(--cs-bg)',
              borderColor: 'var(--cs-border)',
            }}
          >
            <div className="p-3 space-y-0.5" style={{ borderColor: 'var(--cs-border)' }}>
              <div
                className="text-[11px]"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Files scanned
              </div>
              <div
                className="text-sm font-semibold font-mono tabular-nums"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatNumber(progress.filesScanned)}
              </div>
            </div>

            <div className="p-3 space-y-0.5" style={{ borderColor: 'var(--cs-border)' }}>
              <div
                className="text-[11px]"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Size analysed
              </div>
              <div
                className="text-sm font-semibold font-mono tabular-nums"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatBytes(progress.bytesAnalysed, unitMode)}
              </div>
            </div>

            <div className="p-3 space-y-0.5" style={{ borderColor: 'var(--cs-border)' }}>
              <div
                className="text-[11px]"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                Elapsed
              </div>
              <div
                className="text-sm font-semibold font-mono tabular-nums"
                style={{ color: 'var(--cs-text)' }}
              >
                {(progress.elapsedMs / 1000).toFixed(1)}s
              </div>
            </div>
          </div>

          {/* State-Specific Diagnostic Callouts */}
          {isPermissionDenied && (
            <div
              className="p-4 rounded-lg border space-y-2"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
              }}
            >
              <div
                className="flex items-center gap-2 font-semibold"
                style={{ color: 'var(--cs-warning)' }}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>TCC Protected Container ({progress.errorCode})</span>
              </div>
              <p
                className="leading-relaxed"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {progress.errorMessage}
              </p>
              {progress.restrictedPaths && (
                <div
                  className="font-mono text-[11px] pt-1 space-y-0.5"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  {progress.restrictedPaths.map((rp) => (
                    <div key={rp}>Blocked: {rp}</div>
                  ))}
                </div>
              )}
              <p
                className="text-[11px] pt-1"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                In the native Tauri macOS build, grant Clearspace access under{' '}
                <span style={{ color: 'var(--cs-text)' }}>
                  System Settings → Privacy & Security → Full Disk Access
                </span>
                .
              </p>
            </div>
          )}

          {isFailed && (
            <div
              className="p-4 rounded-lg border space-y-2"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
              }}
            >
              <div
                className="flex items-center gap-2 font-semibold"
                style={{ color: 'var(--cs-danger)' }}
              >
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Filesystem Read Error ({progress.errorCode})</span>
              </div>
              <p
                className="leading-relaxed"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {progress.errorMessage}
              </p>
            </div>
          )}

          {isCompleted && (
            <div
              className="p-4 rounded-lg border flex items-start gap-3"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
              }}
            >
              <CheckCircle2
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: 'var(--cs-success)' }}
              />
              <div className="space-y-1">
                <div
                  className="font-semibold"
                  style={{ color: 'var(--cs-text)' }}
                >
                  Demo Dataset Loaded — 64.2 GB Recoverable Identified
                </div>
                <p
                  className="leading-relaxed"
                  style={{ color: 'var(--cs-text-secondary)' }}
                >
                  Analysed simulated Macintosh HD hierarchy (438.0 GB used).
                  Explore the treemap or inspect lockfile-verified developer
                  recommendations.
                </p>
              </div>
            </div>
          )}

          {isEmpty && (
            <div
              className="p-4 rounded-lg border flex items-start gap-3"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
              }}
            >
              <HardDrive
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: 'var(--cs-text-muted)' }}
              />
              <div className="space-y-1">
                <div
                  className="font-semibold"
                  style={{ color: 'var(--cs-text)' }}
                >
                  Target Directory Contains No Files
                </div>
                <p
                  className="leading-relaxed"
                  style={{ color: 'var(--cs-text-secondary)' }}
                >
                  The simulated folder `~/Projects/new-empty-workspace` has 0
                  bytes of content. Close to view the empty dashboard state, or
                  run a Normal Scan to reload Macintosh HD.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-3.5 border-t flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <span
            className="text-[11px]"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            Provider: {isNative ? 'TauriFilesystemProvider (Rust Native Engine)' : 'MockFilesystemProvider'}
          </span>

          <div className="flex items-center gap-2">
            {isScanning ? (
              <button
                type="button"
                onClick={onCancelScan}
                className="px-4 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--cs-surface)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-danger)',
                }}
              >
                Cancel Scan
              </button>
            ) : isPermissionDenied || isFailed ? (
              <>
                <button
                  type="button"
                  onClick={onCloseCompleted}
                  className="px-3.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--cs-surface)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text-secondary)',
                  }}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => onStartScan('normal')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--cs-accent)',
                    color: '#111214',
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Standard Demo Scan</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onStartScan('normal')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--cs-surface)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text)',
                  }}
                >
                  <Radar className="w-3.5 h-3.5" />
                  <span>Rescan</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseCompleted}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--cs-accent)',
                    color: '#111214',
                  }}
                >
                  View Results
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
