import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  EyeOff,
  FileSearch,
  Lock,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import {
  CleanupRecommendation,
  StorageUnitMode,
} from '../../types/storage';
import { formatBytes } from '../../utils/format';

interface CleanupReviewModalProps {
  recommendation: CleanupRecommendation | null;
  unitMode: StorageUnitMode;
  isExcluded: boolean;
  onClose: () => void;
  onInspect: (itemId: string) => void;
  onToggleExclude: (path: string) => void;
  onCopyCommand: (msg: string) => void;
  isNative?: boolean;
  onExecuteCleanup?: (rec: CleanupRecommendation) => Promise<boolean>;
}

export function CleanupReviewModal({
  recommendation,
  unitMode,
  isExcluded,
  onClose,
  onInspect,
  onToggleExclude,
  onCopyCommand,
  isNative = false,
  onExecuteCleanup,
}: CleanupReviewModalProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!recommendation) return null;

  const handleCopyRecovery = async () => {
    if (!recommendation.recoveryCommand) return;
    try {
      await navigator.clipboard.writeText(recommendation.recoveryCommand);
      setCopiedCmd(true);
      onCopyCommand(`Copied recovery command: ${recommendation.recoveryCommand}`);
      window.setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      onCopyCommand(recommendation.recoveryCommand);
    }
  };

  const handleConfirmAndClean = async () => {
    if (!onExecuteCleanup) return;
    setIsCleaning(true);
    setErrorMessage(null);
    try {
      const ok = await onExecuteCleanup(recommendation);
      if (ok) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsCleaning(false);
      setIsConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-review-title"
        className="w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--cs-sidebar)',
          borderColor: 'var(--cs-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-start justify-between gap-4"
          style={{ borderColor: 'var(--cs-border)' }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <RiskIndicator risk={recommendation.risk} />
              <span aria-hidden="true" style={{ color: 'var(--cs-text-muted)' }}>
                ·
              </span>
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                Pre-Cleanup Impact Verification
              </span>
            </div>
            <h2
              id="cleanup-review-title"
              className="text-base font-semibold tracking-tight"
              style={{ color: 'var(--cs-text)' }}
            >
              Artifact: {recommendation.artifactName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md cursor-pointer"
            style={{ color: 'var(--cs-text-secondary)' }}
            aria-label="Close review modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 text-xs max-h-[72vh] overflow-y-auto">
          {errorMessage && (
            <div
              className="p-3.5 rounded-lg border flex items-start gap-3"
              style={{
                backgroundColor: 'rgba(231, 126, 126, 0.1)',
                borderColor: 'var(--cs-danger)',
                color: 'var(--cs-danger)',
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Cleanup Refused for Safety</div>
                <div className="text-[11px] mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          <div
            className="grid grid-cols-2 gap-4 p-3.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--cs-bg)',
              borderColor: 'var(--cs-border)',
            }}
          >
            <div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>Size</div>
              <div
                className="text-lg font-semibold font-mono tabular-nums mt-0.5"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatBytes(recommendation.sizeBytes, unitMode)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--cs-text-secondary)' }}>
                Regenerability
              </div>
              <div
                className="font-medium mt-1"
                style={{ color: 'var(--cs-text)' }}
              >
                {recommendation.regenerabilityLabel}
              </div>
            </div>
          </div>

          <div>
            <div
              className="font-medium mb-1"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              Location
            </div>
            <div
              className="px-3 py-2 rounded-md border font-mono text-[11.5px] break-all"
              style={{
                backgroundColor: 'var(--cs-bg)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              {recommendation.path}
            </div>
          </div>

          <div>
            <div
              className="font-medium mb-1.5"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              Detected Evidence
            </div>
            <ul
              className="space-y-1 pl-4 list-disc"
              style={{ color: 'var(--cs-text)' }}
            >
              {recommendation.detectedMarkers.map((marker) => (
                <li key={marker}>{marker}</li>
              ))}
              <li style={{ color: 'var(--cs-text-secondary)' }}>
                {recommendation.activeDependencyNote}
              </li>
            </ul>
          </div>

          <div>
            <div
              className="font-medium mb-1"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              Impact if Deleted
            </div>
            <p
              className="leading-relaxed"
              style={{ color: 'var(--cs-text)' }}
            >
              {recommendation.deletionConsequence}
            </p>
          </div>

          <div>
            <div
              className="font-medium mb-1.5"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              Recovery Command
            </div>
            <p
              className="mb-2 leading-relaxed"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              {recommendation.restorationSteps}
            </p>
            {recommendation.recoveryCommand && (
              <div
                className="px-3 py-2 rounded-md border font-mono flex items-center justify-between gap-2"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-accent)',
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Terminal className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {recommendation.recoveryCommand}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyRecovery}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer shrink-0"
                  style={{ color: 'var(--cs-text-secondary)' }}
                >
                  {copiedCmd ? (
                    <Check className="w-3 h-3" style={{ color: 'var(--cs-success)' }} />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Safety Notice */}
          <div
            className="p-3.5 rounded-lg border flex items-start gap-3"
            style={{
              backgroundColor: 'var(--cs-bg)',
              borderColor: 'var(--cs-border)',
            }}
          >
            <Lock
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: isNative ? 'var(--cs-success)' : 'var(--cs-warning)' }}
            />
            <div className="space-y-0.5">
              <div
                className="font-semibold"
                style={{ color: 'var(--cs-text)' }}
              >
                {isNative
                  ? 'macOS Native Trash Protection Active'
                  : 'Cleanup Execution Disabled in Browser Prototype'}
              </div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {isNative
                  ? 'Approved items are moved to your user macOS Trash via Finder. Files are never permanently deleted by CLEARSPACE and can be restored at any time from Trash.'
                  : 'Moving items to macOS Trash requires the native Tauri v2 Rust backend. You can inspect metadata, copy restoration commands, or exclude this path now.'}
              </p>
            </div>
          </div>

          {/* Explicit Confirmation Dialog Step */}
          {isConfirming && (
            <div
              className="p-4 rounded-lg border space-y-3"
              style={{
                backgroundColor: 'rgba(231, 183, 109, 0.08)',
                borderColor: 'var(--cs-warning)',
              }}
            >
              <div
                className="font-semibold flex items-center gap-2"
                style={{ color: 'var(--cs-warning)' }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Explicit Confirmation Required</span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--cs-text)' }}
              >
                Are you sure you want to move <strong>{recommendation.artifactName}</strong> ({formatBytes(recommendation.sizeBytes, unitMode)}) to macOS Trash?
              </p>
              <div className="font-mono text-[11px] break-all" style={{ color: 'var(--cs-text-muted)' }}>
                Target: {recommendation.path}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: 'var(--cs-surface)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCleaning}
                  onClick={handleConfirmAndClean}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--cs-danger)',
                    color: '#ffffff',
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isCleaning ? 'Moving to Trash…' : 'Confirm: Move to Trash'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onInspect(recommendation.itemId);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }}
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleExclude(recommendation.path)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: isExcluded
                  ? 'var(--cs-accent-muted)'
                  : 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                color: isExcluded
                  ? 'var(--cs-accent)'
                  : 'var(--cs-text-secondary)',
              }}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{isExcluded ? 'Excluded' : 'Exclude'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text-secondary)',
              }}
            >
              Cancel
            </button>

            {!isNative ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border text-xs font-semibold opacity-45 cursor-not-allowed whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--cs-surface-elevated)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text-secondary)',
                }}
                title="Disabled until connected to native Tauri v2 Rust backend"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Move to Trash (Tauri Required)</span>
              </button>
            ) : !isConfirming ? (
              <button
                type="button"
                onClick={() => setIsConfirming(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--cs-danger)',
                  color: '#ffffff',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to macOS Trash</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
