import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FileMetadata, ScanProgress, ScanResult } from '../types/storage';

export interface RustScanOptions {
  targetPath: string;
  excludedFolders: string[];
  includeHiddenFiles: boolean;
  maxDepth?: number;
  symlinkHandling: string;
}

export interface CleanupResultItem {
  path: string;
  sizeBytes: number;
  success: boolean;
  errorMessage?: string;
}

export interface CleanupExecutionRequest {
  targetPaths: string[];
  requireTrash: boolean;
}

export interface CleanupExecutionResponse {
  totalRequested: number;
  totalSucceeded: number;
  totalBytesReclaimed: number;
  results: CleanupResultItem[];
}

export interface ClearspaceBackend {
  greet(name: string): Promise<string>;
  pickScanDirectory(defaultPath?: string): Promise<string | null>;
  scanDirectory(options: RustScanOptions): Promise<ScanResult>;
  cancelScan(): Promise<void>;
  inspectFilesystemItem(path: string): Promise<FileMetadata | null>;
  moveToTrash(targetPath: string): Promise<CleanupResultItem>;
  executeCleanupBatch(request: CleanupExecutionRequest): Promise<CleanupExecutionResponse>;
  loadLatestScanSqlite(snapshotId?: string): Promise<ScanResult | null>;
  listScanHistorySqlite(): Promise<ScanResult[]>;
  clearScanHistorySqlite(): Promise<void>;
  saveAppSettings(settingsJson: string): Promise<void>;
  loadAppSettings(): Promise<string | null>;
  onScanProgress(callback: (progress: ScanProgress) => void): Promise<UnlistenFn>;
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const clearspaceBackend: ClearspaceBackend = {
  greet(name) {
    return invoke<string>('greet', { name });
  },
  pickScanDirectory(defaultPath) {
    return invoke<string | null>('pick_scan_directory', { defaultPath });
  },
  scanDirectory(options) {
    return invoke<ScanResult>('scan_directory', { options });
  },
  cancelScan() {
    return invoke<void>('cancel_scan');
  },
  inspectFilesystemItem(path) {
    return invoke<FileMetadata | null>('inspect_filesystem_item', { path });
  },
  moveToTrash(targetPath) {
    return invoke<CleanupResultItem>('move_item_to_trash', { targetPath });
  },
  executeCleanupBatch(request) {
    return invoke<CleanupExecutionResponse>('execute_cleanup_batch', { request });
  },
  loadLatestScanSqlite(snapshotId) {
    return invoke<ScanResult | null>('load_latest_scan_sqlite', { snapshotId });
  },
  listScanHistorySqlite() {
    return invoke<ScanResult[]>('list_scan_history_sqlite');
  },
  clearScanHistorySqlite() {
    return invoke<void>('clear_scan_history_sqlite');
  },
  saveAppSettings(settingsJson) {
    return invoke<void>('save_app_settings', { settingsJson });
  },
  loadAppSettings() {
    return invoke<string | null>('load_app_settings');
  },
  onScanProgress(callback) {
    return listen<ScanProgress>('clearspace://scan-progress', (event) => {
      callback(event.payload);
    });
  },
};
