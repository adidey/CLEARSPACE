import { Folder, HardDrive, ShieldCheck } from 'lucide-react';

interface OnboardingModalProps {
  onSelectAndScan: () => void;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Folder,
    title: 'Choose a folder',
    description:
      'Select a directory to analyse. Start with your home folder (~) or a specific projects directory.',
  },
  {
    icon: HardDrive,
    title: 'Review what\'s found',
    description:
      'CLEARSPACE identifies developer artifacts, large files, and storage categories — before touching anything.',
  },
  {
    icon: ShieldCheck,
    title: 'Clean with confidence',
    description:
      'Approve each item individually. Everything moves to macOS Trash — never permanently deleted.',
  },
];

export function OnboardingModal({ onSelectAndScan, onDismiss }: OnboardingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="w-full max-w-lg rounded-xl border overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--cs-sidebar)',
          borderColor: 'var(--cs-border)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
        >
          <div
            className="text-[11px] font-mono mb-1"
            style={{ color: 'var(--cs-accent)' }}
          >
            WELCOME TO CLEARSPACE
          </div>
          <h2
            id="onboarding-modal-title"
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'var(--cs-text)' }}
          >
            Developer storage, under control.
          </h2>
          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Three steps to reclaim your disk space — safely.
          </p>
        </div>

        {/* Step Cards */}
        <div className="px-6 pb-4 space-y-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex items-start gap-3 p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--cs-bg)',
                  borderColor: 'var(--cs-border)',
                }}
              >
                <div
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold font-mono"
                  style={{
                    backgroundColor: 'var(--cs-accent-muted)',
                    color: 'var(--cs-accent)',
                  }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cs-accent)' }} />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--cs-text)' }}
                    >
                      {step.title}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--cs-text-secondary)' }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-4 border-t flex flex-col items-center gap-3"
          style={{
            backgroundColor: 'var(--cs-bg)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <button
            type="button"
            onClick={onSelectAndScan}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold cursor-pointer"
            style={{
              backgroundColor: 'var(--cs-accent)',
              color: '#111214',
            }}
          >
            <Folder className="w-4 h-4" />
            Choose Folder to Scan
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs cursor-pointer"
            style={{ color: 'var(--cs-text-secondary)' }}
          >
            Explore demo data first
          </button>
        </div>
      </div>
    </div>
  );
}

