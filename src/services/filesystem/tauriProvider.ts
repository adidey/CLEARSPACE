import { FileMetadata, ScanResult, ScanStatus } from '../../types/storage';
import { clearspaceBackend, RustScanOptions } from '../backend';
import { FilesystemProvider, findStorageItemByIdOrPath, ScanOptions } from './types';

export class TauriFilesystemProvider implements FilesystemProvider {
  public readonly providerName = 'TauriFilesystemProvider (Rust Native Engine)';
  public readonly isNativeBackend = true;

  private history: ScanResult[] = [];

  public static isTauriRuntimeAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>)
    );
  }

  async selectDirectory(defaultPath?: string): Promise<string | null> {
    return clearspaceBackend.pickScanDirectory(defaultPath);
  }

  async scanDirectory(options: ScanOptions): Promise<ScanResult> {
    let unlisten: (() => void) | null = null;

    if (options.onProgress) {
      unlisten = await clearspaceBackend.onScanProgress(options.onProgress);
    }

    const abortHandler = () => {
      clearspaceBackend.cancelScan().catch(console.error);
    };

    if (options.signal) {
      options.signal.addEventListener('abort', abortHandler, { once: true });
    }

    const maxDepthNum =
      options.maxDepth === '5'
        ? 5
        : options.maxDepth === '8'
        ? 8
        : options.maxDepth === '12'
        ? 12
        : undefined;

    const rustOptions: RustScanOptions = {
      targetPath: options.targetPath,
      excludedFolders: options.excludedFolders,
      includeHiddenFiles: options.includeHiddenFiles,
      maxDepth: maxDepthNum,
      symlinkHandling: options.symlinkHandling,
    };

    try {
      const result = await clearspaceBackend.scanDirectory(rustOptions);
      this.history = [result, ...this.history.slice(0, 19)];
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('cancelled') || errorMsg.includes('Cancel')) {
        const abortErr = new Error('Scan cancelled by user.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      throw err;
    } finally {
      if (unlisten) {
        unlisten();
      }
      if (options.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }
    }
  }

  async inspectItem(
    pathOrId: string,
    snapshotId?: string
  ): Promise<FileMetadata | null> {
    const scan =
      this.history.find((s) => s.id === snapshotId) ?? this.history[0];
    if (scan) {
      const found = findStorageItemByIdOrPath(scan.rootItem, pathOrId);
      if (found) return found;
    }
    // Fall back to live filesystem inspection if path looks like a path
    if (pathOrId.startsWith('/') || pathOrId.startsWith('~')) {
      return clearspaceBackend.inspectFilesystemItem(pathOrId);
    }
    return null;
  }

  async getScanResults(snapshotId?: string): Promise<ScanResult> {
    if (snapshotId) {
      const match = this.history.find((s) => s.id === snapshotId);
      if (match) return match;
    }
    const fromSqlite = await clearspaceBackend.loadLatestScanSqlite(snapshotId);
    if (fromSqlite) {
      this.appendHistory(fromSqlite);
      return fromSqlite;
    }
    if (this.history.length > 0) {
      return this.history[0];
    }
    throw new Error('No scans performed yet.');
  }

  async getScanHistory(): Promise<ScanResult[]> {
    try {
      const dbHistory = await clearspaceBackend.listScanHistorySqlite();
      if (dbHistory && dbHistory.length > 0) {
        this.history = dbHistory;
        return dbHistory;
      }
    } catch (e) {
      console.warn('Failed to load scan history from SQLite:', e);
    }
    return [...this.history];
  }

  public appendHistory(scan: ScanResult) {
    this.history = [scan, ...this.history.filter((s) => s.id !== scan.id)];
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    try {
      await clearspaceBackend.clearScanHistorySqlite();
    } catch (e) {
      console.warn('Failed to clear SQLite history:', e);
    }
  }
}

export const tauriFilesystemProvider = new TauriFilesystemProvider();
