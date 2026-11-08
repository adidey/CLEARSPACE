import {
  ArtifactEcosystem,
  RiskClassification,
  StorageCategory,
  StorageUnitMode,
} from '../types/storage';

const DECIMAL_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];

export function formatBytes(
  bytes: number,
  unitMode: StorageUnitMode = 'decimal',
  decimals = 1
): string {
  if (bytes === 0) return '0 B';
  const base = unitMode === 'decimal' ? 1000 : 1024;
  const units = unitMode === 'decimal' ? DECIMAL_UNITS : BINARY_UNITS;
  const exponent = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(base)),
    units.length - 1
  );
  const value = bytes / Math.pow(base, exponent);
  const precision = exponent <= 1 ? 0 : decimals;
  return `${value.toFixed(precision)} ${units[exponent]}`;
}

export function formatPercent(ratioOrPercent: number, decimals = 1): string {
  return `${ratioOrPercent.toFixed(decimals)}%`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(isoDate: string, referenceIso?: string): string {
  const target = new Date(isoDate).getTime();
  const now = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  if (Number.isNaN(target)) return isoDate;
  const diffSec = Math.max(0, Math.floor((now - target) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export const CATEGORY_COLOR_MAP: Record<
  StorageCategory,
  { hex: string; subtleBg: string; borderHex: string }
> = {
  [StorageCategory.DeveloperFiles]: {
    hex: '#A6B8FF',
    subtleBg: 'rgba(166, 184, 255, 0.16)',
    borderHex: 'rgba(166, 184, 255, 0.36)',
  },
  [StorageCategory.Applications]: {
    hex: '#65C99A',
    subtleBg: 'rgba(101, 201, 154, 0.16)',
    borderHex: 'rgba(101, 201, 154, 0.36)',
  },
  [StorageCategory.SystemData]: {
    hex: '#8C95A6',
    subtleBg: 'rgba(140, 149, 166, 0.16)',
    borderHex: 'rgba(140, 149, 166, 0.36)',
  },
  [StorageCategory.Documents]: {
    hex: '#E7B76D',
    subtleBg: 'rgba(231, 183, 109, 0.16)',
    borderHex: 'rgba(231, 183, 109, 0.36)',
  },
  [StorageCategory.Media]: {
    hex: '#C49BFF',
    subtleBg: 'rgba(196, 155, 255, 0.16)',
    borderHex: 'rgba(196, 155, 255, 0.36)',
  },
  [StorageCategory.Other]: {
    hex: '#5D6675',
    subtleBg: 'rgba(93, 102, 117, 0.18)',
    borderHex: 'rgba(93, 102, 117, 0.38)',
  },
};

export interface RiskMeta {
  label: string;
  shortLabel: string;
  description: string;
  colorVar: string;
  hex: string;
}

export const RISK_META: Record<RiskClassification, RiskMeta> = {
  [RiskClassification.VerifiedSafe]: {
    label: 'Verified Safe',
    shortLabel: 'Verified safe',
    description: 'Strong evidence of disposability; lockfile or cache manifest verified intact.',
    colorVar: 'var(--cs-success)',
    hex: '#65C99A',
  },
  [RiskClassification.LowRisk]: {
    label: 'Low Risk',
    shortLabel: 'Low risk',
    description: 'Generally regenerable via build tools or package managers with rebuild time cost.',
    colorVar: 'var(--cs-accent)',
    hex: '#A6B8FF',
  },
  [RiskClassification.ReviewRequired]: {
    label: 'Review Required',
    shortLabel: 'Review required',
    description: 'May contain local configuration, unpinned packages, or stateful container data.',
    colorVar: 'var(--cs-warning)',
    hex: '#E7B76D',
  },
  [RiskClassification.HighRisk]: {
    label: 'High Risk',
    shortLabel: 'High risk',
    description: 'User source files, databases, system frameworks, or irreplaceable assets.',
    colorVar: 'var(--cs-danger)',
    hex: '#E77E7E',
  },
};

export const ECOSYSTEM_LABELS: Record<ArtifactEcosystem, string> = {
  [ArtifactEcosystem.NodeJS]: 'Node.js',
  [ArtifactEcosystem.Python]: 'Python',
  [ArtifactEcosystem.AppleDev]: 'Apple Development',
  [ArtifactEcosystem.Docker]: 'Docker',
  [ArtifactEcosystem.Other]: 'JVM, Rust, Go & Other',
};
