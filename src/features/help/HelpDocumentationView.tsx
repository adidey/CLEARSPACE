import { Cpu, Keyboard, Layers, ShieldCheck } from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import { RiskClassification } from '../../types/storage';
import { RISK_META } from '../../utils/format';

export function HelpDocumentationView() {
  return (
    <div className="p-6 lg:px-8 lg:py-6 max-w-4xl mx-auto space-y-8 text-xs">
      {/* Header */}
      <div
        className="pb-4 border-b space-y-1"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--cs-text)' }}
        >
          Help & Architecture Documentation
        </h1>
        <p
          className="leading-relaxed"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          How Clearspace evaluates developer artifacts, classifies regeneration
          safety, and bridges with Tauri v2 on macOS.
        </p>
      </div>

      {/* Classification Reference */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="w-4 h-4"
            style={{ color: 'var(--cs-accent)' }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--cs-text)' }}
          >
            Risk Classification Methodology
          </h2>
        </div>

        <p
          className="leading-relaxed"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          Clearspace never classifies a directory as disposable based solely on
          its filename. Every candidate is cross-checked against lockfiles,
          daemon mount tables, and Git working tree state:
        </p>

        <div
          className="border rounded-lg divide-y"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {(
            [
              RiskClassification.VerifiedSafe,
              RiskClassification.LowRisk,
              RiskClassification.ReviewRequired,
              RiskClassification.HighRisk,
            ] as const
          ).map((tier) => (
            <div
              key={tier}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderColor: 'var(--cs-border-subtle)' }}
            >
              <div className="w-44 shrink-0">
                <RiskIndicator risk={tier} />
              </div>
              <p
                className="flex-1 leading-relaxed"
                style={{ color: 'var(--cs-text-secondary)' }}
              >
                {RISK_META[tier].description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tauri v2 + Rust Integration Blueprint */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--cs-text)' }}
          >
            Tauri v2 & Rust Backend Architecture
          </h2>
        </div>

        <div
          className="p-4 rounded-lg border space-y-3"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <p
            className="leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            This browser prototype uses{' '}
            <code className="font-mono">MockFilesystemProvider</code> with
            clearly labeled demo data and disables destructive file operations.
            The frontend is decoupled behind the{' '}
            <code className="font-mono">FilesystemProvider</code> contract so
            swapping in{' '}
            <code className="font-mono">TauriFilesystemProvider</code> requires
            zero UI component changes:
          </p>

          <pre
            className="p-3 rounded-md border font-mono text-[11px] overflow-x-auto leading-relaxed"
            style={{
              backgroundColor: 'var(--cs-bg)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text)',
            }}
          >{`FilesystemProvider Interface (src/services/filesystem/types.ts)
 ├── selectDirectory()  → tauri::plugin::dialog::FileDialogBuilder
 ├── scanDirectory()    → Rust jwalk parallel APFS walker + Tauri Event stream
 ├── inspectItem()      → std::fs::symlink_metadata + lockfile verifier
 └── getScanResults()   → Local rusqlite snapshot persistence`}</pre>
        </div>
      </section>

      {/* Keyboard Shortcuts & Navigation Tips */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--cs-text)' }}
          >
            Desktop Shortcuts & Navigation
          </h2>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 border rounded-lg divide-y sm:divide-y-0 sm:divide-x"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <div className="p-4 space-y-2" style={{ borderColor: 'var(--cs-border)' }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                Quick jump to any folder or artifact
              </span>
              <kbd
                className="px-2 py-0.5 rounded border font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text)',
                }}
              >
                ⌘K / Ctrl+K
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                Close Inspection Drawer or Modal
              </span>
              <kbd
                className="px-2 py-0.5 rounded border font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text)',
                }}
              >
                Esc
              </kbd>
            </div>
          </div>

          <div className="p-4 space-y-2" style={{ borderColor: 'var(--cs-border)' }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                Inspect item metadata & recovery CLI
              </span>
              <span
                className="font-mono text-[11px]"
                style={{ color: 'var(--cs-text)' }}
              >
                Single Click
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--cs-text-secondary)' }}>
                Enter nested folder in Treemap / Table
              </span>
              <span
                className="font-mono text-[11px]"
                style={{ color: 'var(--cs-text)' }}
              >
                Double Click
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* macOS Permissions Note */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: 'var(--cs-accent)' }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--cs-text)' }}
          >
            macOS Full Disk Access
          </h2>
        </div>
        <p
          className="leading-relaxed"
          style={{ color: 'var(--cs-text-secondary)' }}
        >
          On macOS Sonoma and Sequoia, developer paths inside{' '}
          <code className="font-mono">~/Library/Containers/com.docker.docker</code>{' '}
          and <code className="font-mono">~/Library/Developer</code> are
          protected by Transparency, Consent, and Control (TCC). You can test
          how Clearspace surfaces TCC permission guidance by clicking{' '}
          <strong style={{ color: 'var(--cs-text)' }}>Scan Storage</strong> and
          selecting the{' '}
          <strong style={{ color: 'var(--cs-text)' }}>Permission Denied</strong>{' '}
          simulation mode.
        </p>
      </section>
    </div>
  );
}
