export enum StorageCategory {
  DeveloperFiles = 'Developer Files',
  Applications = 'Applications',
  SystemData = 'System Data',
  Documents = 'Documents',
  Media = 'Media',
  Other = 'Other',
}

export enum RiskClassification {
  VerifiedSafe = 'VERIFIED_SAFE',
  LowRisk = 'LOW_RISK',
  ReviewRequired = 'REVIEW_REQUIRED',
  HighRisk = 'HIGH_RISK',
}

export enum ArtifactEcosystem {
  NodeJS = 'NODE_JS',
  Python = 'PYTHON',
  AppleDev = 'APPLE_DEV',
  Docker = 'DOCKER',
  Other = 'OTHER',
}

export enum Regenerability {
  FullyRegenerable = 'Fully regenerable',
  RebuildRequired = 'Requires rebuild or download',
  Conditional = 'Conditional — check local state',
  NonRegenerable = 'Not automatically regenerable',
}

export enum ScanStatus {
  Idle = 'IDLE',
  Scanning = 'SCANNING',
  Completed = 'COMPLETED',
  PermissionDenied = 'PERMISSION_DENIED',
  Failed = 'FAILED',
  Empty = 'EMPTY',
}

export type NavSection =
  | 'overview'
  | 'explorer'
  | 'artifacts'
  | 'recommendations'
  | 'history'
  | 'settings'
  | 'help';

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  kind: 'directory' | 'file' | 'archive' | 'disk-image' | 'cache' | 'bundle';
  fileTypeLabel: string;
  lastModified: string; // ISO timestamp
  category: StorageCategory;
  risk: RiskClassification;
  associatedProject?: string;
  detectionReason: string;
  regenerationInstructions?: string;
  recoveryCommand?: string;
  cleanupImpact: string;
  itemCount?: number;
  isHidden?: boolean;
  isSymlink?: boolean;
}

export interface StorageItem extends FileMetadata {
  children?: StorageItem[];
}

export interface CategorySummary {
  category: StorageCategory;
  sizeBytes: number;
  percentageOfUsed: number;
  percentageOfTotal: number;
  itemCount: number;
}

export interface DeveloperArtifact {
  id: string;
  itemId: string;
  name: string;
  artifactType: string;
  ecosystem: ArtifactEcosystem;
  sizeBytes: number;
  path: string;
  lastModified: string;
  associatedProject?: string;
  regenerability: Regenerability;
  risk: RiskClassification;
  detectedEvidence: string[];
  detectionReason: string;
  cleanupImpact: string;
  recoveryCommand?: string;
  regenerationInstructions: string;
  activeDependencies: string;
}

export interface CleanupRecommendation {
  id: string;
  itemId: string;
  title: string;
  artifactName: string;
  path: string;
  sizeBytes: number;
  category: StorageCategory;
  ecosystem?: ArtifactEcosystem;
  risk: RiskClassification;
  priorityRank: number;
  whatItIs: string;
  whyIdentified: string;
  detectedMarkers: string[];
  canRegenerate: boolean;
  regenerabilityLabel: string;
  deletionConsequence: string;
  activeDependenciesDetected: boolean;
  activeDependencyNote: string;
  restorationSteps: string;
  recoveryCommand?: string;
  lastAccessedDaysAgo: number;
}

export interface ScanProgress {
  status: ScanStatus;
  percentComplete: number;
  currentDirectory: string;
  filesScanned: number;
  bytesAnalysed: number;
  elapsedMs: number;
  errorMessage?: string;
  errorCode?: string;
  restrictedPaths?: string[];
}

export interface ScanResult {
  id: string;
  isMockData: boolean;
  dataSourceLabel: string;
  volumeName: string;
  volumeFormat: string;
  mountPoint: string;
  scannedAt: string;
  scanDurationSeconds: number;
  totalCapacityBytes: number;
  usedBytes: number;
  availableBytes: number;
  recoverableBytes: number;
  largestDirectoryPath: string;
  largestDirectoryBytes: number;
  categories: CategorySummary[];
  rootItem: StorageItem;
  topConsumers: StorageItem[];
  artifacts: DeveloperArtifact[];
  recommendations: CleanupRecommendation[];
}

export type StorageUnitMode = 'decimal' | 'binary';
export type ThemeAppearance = 'dark' | 'slate' | 'light';

export interface AppSettings {
  appearance: ThemeAppearance;
  storageUnits: StorageUnitMode;
  defaultScanLocation: string;
  excludedFolders: string[];
  maxScanDepth: 'unlimited' | '5' | '8' | '12';
  includeHiddenFiles: boolean;
  symlinkHandling: 'ignore' | 'follow-local';
  localOnlyConfirmed: boolean;
  scanHistoryRetention: '30d' | '90d' | 'forever' | 'session';
  telemetryEnabled: false;
  requireReviewChecklist: boolean;
  requireTypedConfirmationOver10GB: boolean;
  moveToTrashInsteadOfPermanent: boolean;
  protectGitUncommitted: boolean;
  protectEnvFiles: boolean;
  protectDockerVolumes: boolean;
}
