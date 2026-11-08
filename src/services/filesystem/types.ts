import {
  FileMetadata,
  ScanProgress,
  ScanResult,
  StorageItem,
} from '../../types/storage';

export type ScanSimulationScenario =
  | 'normal'
  | 'permission-denied'
  | 'failed'
  | 'empty';

export interface ScanOptions {
  targetPath: string;
  excludedFolders: string[];
  includeHiddenFiles: boolean;
  maxDepth: 'unlimited' | '5' | '8' | '12';
  symlinkHandling: 'ignore' | 'follow-local';
  scenario?: ScanSimulationScenario;
  onProgress?: (progress: ScanProgress) => void;
  signal?: AbortSignal;
}

/**
 * FilesystemProvider abstracts native Tauri v2 Rust commands from UI components.
 * In the browser prototype, MockFilesystemProvider supplies labeled DEMO data.
 * In the desktop build, TauriFilesystemProvider invokes native Rust walkers.
 */
export interface FilesystemProvider {
  readonly providerName: string;
  readonly isNativeBackend: boolean;

  selectDirectory(defaultPath?: string): Promise<string | null>;

  scanDirectory(options: ScanOptions): Promise<ScanResult>;

  inspectItem(pathOrId: string, snapshotId?: string): Promise<FileMetadata | null>;

  getScanResults(snapshotId?: string): Promise<ScanResult>;

  getScanHistory(): Promise<ScanResult[]>;
}

export function findStorageItemByIdOrPath(
  root: StorageItem,
  query: string
): StorageItem | null {
  if (root.id === query || root.path === query) {
    return root;
  }
  if (root.children) {
    for (const child of root.children) {
      const match = findStorageItemByIdOrPath(child, query);
      if (match) return match;
    }
  }
  return null;
}

export function getBreadcrumbChain(
  root: StorageItem,
  targetId: string
): StorageItem[] {
  if (root.id === targetId) return [root];
  if (root.children) {
    for (const child of root.children) {
      const subPath = getBreadcrumbChain(child, targetId);
      if (subPath.length > 0) {
        return [root, ...subPath];
      }
    }
  }
  return [];
}

export function flattenStorageTree(root: StorageItem): StorageItem[] {
  const result: StorageItem[] = [root];
  if (root.children) {
    for (const child of root.children) {
      result.push(...flattenStorageTree(child));
    }
  }
  return result;
}
