import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { RiskClassification } from '../types/storage';
import { RISK_META } from '../utils/format';

interface RiskIndicatorProps {
  risk: RiskClassification;
  compact?: boolean;
}

export function RiskIndicator({ risk, compact = false }: RiskIndicatorProps) {
  const meta = RISK_META[risk];

  const Icon =
    risk === RiskClassification.VerifiedSafe
      ? CheckCircle2
      : risk === RiskClassification.LowRisk
      ? Info
      : risk === RiskClassification.ReviewRequired
      ? AlertTriangle
      : ShieldAlert;

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-xs font-medium"
      style={{ color: meta.colorVar }}
      title={meta.description}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
