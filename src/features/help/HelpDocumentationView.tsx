import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileCode2,
  FolderLock,
  Keyboard,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import { RiskClassification } from '../../types/storage';
import { RISK_META } from '../../utils/format';

export function HelpDocumentationView() {
  return (
    <div className="p-6 lg:px-10 lg:py-8 max-w-[1100px] mx-auto space-y-8 text-xs select-none">
      {/* 1. Header */}
      <div className="pb-6 border-b space-y-1.5" style={{ borderColor: 'var(--cs-border)' }}>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--cs-text)' }}>
          Deletion Intelligence & Safety Logic
        </h1>
        <p className="text-xs max-w-2xl leading-relaxed" style={{ color: 'var(--cs-text-secondary)' }}>
          CLEARSPACE operates on an evidence-based verification model. We never recommend deleting an item based on its name alone.
        </p>
      </div>

      {/* 2. The 4-Pillar Deletion Intelligence Logic Matrix */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-[var(--cs-accent)]" />
          <h2 className="text-base font-semibold" style={{ color: 'var(--cs-text)' }}>
            The 4-Pillar Safety Matrix
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pillar 1 */}
          <div
            className="p-5 rounded-xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'rgba(101, 201, 154, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[var(--cs-success)]">
                Pillar 1: Lockfile Proof
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(101,201,154,0.12)] text-[var(--cs-success)]">
                VERIFIED SAFE
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--cs-text-secondary)]">
              Dependency trees (<code className="font-mono text-[var(--cs-text)]">node_modules/</code>, <code className="font-mono text-[var(--cs-text)]">.venv/</code>) are marked <strong>Verified Safe</strong> only when both the project manifest (<code className="font-mono">package.json</code>) and lockfile (<code className="font-mono">package-lock.json</code>, <code className="font-mono">pnpm-lock.yaml</code>, <code className="font-mono">poetry.lock</code>) are verified intact.
            </p>
            <div className="pt-1 font-mono text-[11px] text-[var(--cs-text-muted)] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[var(--cs-accent)]" />
              <span>npm install / poetry install (100% reproducible)</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div
            className="p-5 rounded-xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'rgba(101, 201, 154, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[var(--cs-success)]">
                Pillar 2: Build Intermediates
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(101,201,154,0.12)] text-[var(--cs-success)]">
                VERIFIED SAFE
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--cs-text-secondary)]">
              Compiled object files, incremental caches, and build targets (Rust <code className="font-mono text-[var(--cs-text)]">target/</code>, Xcode <code className="font-mono text-[var(--cs-text)]">DerivedData/</code>, Gradle <code className="font-mono text-[var(--cs-text)]">build/</code>) with an active compiler manifest.
            </p>
            <div className="pt-1 font-mono text-[11px] text-[var(--cs-text-muted)] flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--cs-accent)]" />
              <span>Automatically recreated on next build / compile</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div
            className="p-5 rounded-xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'rgba(231, 183, 109, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[var(--cs-warning)]">
                Pillar 3: Unlocked / Ambiguous
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(231,183,109,0.12)] text-[var(--cs-warning)]">
                REVIEW REQUIRED
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--cs-text-secondary)]">
              Directories with missing lockfiles or vendor trees without pin manifests (e.g. Go <code className="font-mono">vendor/</code> without <code className="font-mono">go.sum</code>). Clearspace refuses to classify these as auto-safe because reinstalling may pull breaking updates.
            </p>
            <div className="pt-1 font-mono text-[11px] text-[var(--cs-text-muted)] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--cs-warning)]" />
              <span>Requires developer inspection before trashing</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div
            className="p-5 rounded-xl border space-y-2.5"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'rgba(231, 126, 126, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[var(--cs-danger)]">
                Pillar 4: Invariant Protection
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(231,126,126,0.12)] text-[var(--cs-danger)]">
                UNTOUCHABLE
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--cs-text-secondary)]">
              Source code (<code className="font-mono text-[var(--cs-text)]">src/</code>), Git history (<code className="font-mono text-[var(--cs-text)]">.git/</code>), environment secrets (<code className="font-mono text-[var(--cs-text)]">.env*</code>, <code className="font-mono">~/.ssh</code>), and personal user documents (<code className="font-mono">~/Documents</code>) are strictly blocked by the native safety engine.
            </p>
            <div className="pt-1 font-mono text-[11px] text-[var(--cs-text-muted)] flex items-center gap-1.5">
              <FolderLock className="w-3.5 h-3.5 text-[var(--cs-danger)]" />
              <span>Hardcoded kernel and canonical path denial</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Safe Cleanup Guarantee */}
      <section
        className="p-5 rounded-xl border space-y-2"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
      >
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--cs-text)' }}>
          <CheckCircle2 className="w-4 h-4 text-[var(--cs-success)]" />
          <span>The Zero Permanent Deletion Guarantee</span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--cs-text-secondary)]">
          CLEARSPACE never executes <code className="font-mono">rm -rf</code> on your projects. Every cleanup action uses the native macOS <code className="font-mono">NSWorkspace</code> API to move targets directly into the macOS <strong>Trash</strong> (<code className="font-mono">~/.Trash</code>). If you ever change your mind, right-click the item in Finder and select <strong>Put Back</strong> to restore it instantly to its exact original location.
        </p>
      </section>

      {/* 4. Keyboard Shortcuts */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-[var(--cs-accent)]" />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cs-text)' }}>
            Keyboard Shortcuts
          </h2>
        </div>

        <div
          className="border rounded-xl divide-y overflow-hidden"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {[
            { shortcut: '⌘K', action: 'Open Raycast-style Quick Search' },
            { shortcut: 'Esc', action: 'Close inspection drawers and modal dialogs' },
            { shortcut: 'Double-Click', action: 'Drill down into folder in Storage Explorer' },
            { shortcut: 'Single-Click', action: 'Inspect file or artifact metadata' },
          ].map(({ shortcut, action }) => (
            <div
              key={shortcut}
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderColor: 'var(--cs-border-subtle)' }}
            >
              <kbd
                className="px-2 py-1 rounded border font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-accent)',
                }}
              >
                {shortcut}
              </kbd>
              <span className="text-xs text-[var(--cs-text-secondary)]">
                {action}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
