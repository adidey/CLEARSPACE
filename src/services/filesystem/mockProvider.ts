import {
  FileMetadata,
  ScanResult,
  ScanStatus,
} from '../../types/storage';
import {
  HISTORICAL_SCAN_RESULTS,
  PRIMARY_SCAN_RESULT,
  SIMULATED_SCAN_PATHS,
} from './mockData';
import {
  FilesystemProvider,
  findStorageItemByIdOrPath,
  ScanOptions,
} from './types';

export class MockFilesystemProvider implements FilesystemProvider {
  public readonly providerName = 'MockFilesystemProvider (Browser Prototype)';
  public readonly isNativeBackend = false;

  private history: ScanResult[] = [...HISTORICAL_SCAN_RESULTS];

  async selectDirectory(defaultPath = '~/Projects'): Promise<string | null> {
    return defaultPath;
  }

  async scanDirectory(options: ScanOptions): Promise<ScanResult> {
    const scenario = options.scenario ?? 'normal';
    const totalSteps = 28;
    const stepDelayMs = 115;
    const totalBytes = PRIMARY_SCAN_RESULT.usedBytes;
    const totalFiles = 942_180;
    const startTime = Date.now();

    for (let step = 1; step <= totalSteps; step++) {
      if (options.signal?.aborted) {
        const abortErr = new Error('Scan cancelled by user.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      const ratio = step / totalSteps;
      const currentPath =
        SIMULATED_SCAN_PATHS[step % SIMULATED_SCAN_PATHS.length];

      // Trigger simulated mid-scan error states realistically
      if (scenario === 'permission-denied' && step === 11) {
        const err = new Error(
          'Full Disk Access is required to inspect protected macOS containers (~/Library/Containers, ~/Library/Developer).'
        );
        err.name = 'PermissionDeniedError';
        options.onProgress?.({
          status: ScanStatus.PermissionDenied,
          percentComplete: Math.round(ratio * 100),
          currentDirectory: '~/Library/Containers/com.docker.docker',
          filesScanned: Math.floor(totalFiles * ratio),
          bytesAnalysed: Math.floor(totalBytes * ratio),
          elapsedMs: Date.now() - startTime,
          errorCode: 'EACCES_TCC_PROTECTED',
          errorMessage: err.message,
          restrictedPaths: [
            '~/Library/Containers/com.docker.docker',
            '~/Library/Safari',
            '/private/var/db',
          ],
        });
        throw err;
      }

      if (scenario === 'failed' && step === 15) {
        const err = new Error(
          'I/O read interrupted while traversing APFS snapshot metadata (POSIX EIO: Device unmounted or snapshot locked).'
        );
        err.name = 'ScanFailedError';
        options.onProgress?.({
          status: ScanStatus.Failed,
          percentComplete: Math.round(ratio * 100),
          currentDirectory: '/Volumes/ExternalBuildScratch',
          filesScanned: Math.floor(totalFiles * ratio),
          bytesAnalysed: Math.floor(totalBytes * ratio),
          elapsedMs: Date.now() - startTime,
          errorCode: 'POSIX_EIO_5',
          errorMessage: err.message,
        });
        throw err;
      }

      options.onProgress?.({
        status: ScanStatus.Scanning,
        percentComplete: Math.min(99, Math.round(ratio * 100)),
        currentDirectory: currentPath,
        filesScanned: Math.floor(totalFiles * ratio),
        bytesAnalysed: Math.floor(totalBytes * ratio),
        elapsedMs: Date.now() - startTime,
      });

      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, stepDelayMs);
        options.signal?.addEventListener(
          'abort',
          () => {
            window.clearTimeout(timer);
            const abortErr = new Error('Scan cancelled by user.');
            abortErr.name = 'AbortError';
            reject(abortErr);
          },
          { once: true }
        );
      });
    }

    if (scenario === 'empty') {
      const emptyScan: ScanResult = {
        ...PRIMARY_SCAN_RESULT,
        id: `scan-empty-${Date.now()}`,
        volumeName: `${options.targetPath} (Empty Directory)`,
        mountPoint: options.targetPath,
        scannedAt: new Date().toISOString(),
        scanDurationSeconds: Number(((Date.now() - startTime) / 1000).toFixed(1)),
        usedBytes: 0,
        recoverableBytes: 0,
        categories: [],
        topConsumers: [],
        artifacts: [],
        recommendations: [],
        rootItem: {
          ...PRIMARY_SCAN_RESULT.rootItem,
          id: 'empty-root',
          name: options.targetPath,
          path: options.targetPath,
          sizeBytes: 0,
          itemCount: 0,
          children: [],
        },
      };
      options.onProgress?.({
        status: ScanStatus.Empty,
        percentComplete: 100,
        currentDirectory: options.targetPath,
        filesScanned: 0,
        bytesAnalysed: 0,
        elapsedMs: Date.now() - startTime,
      });
      return emptyScan;
    }

    const completedScan: ScanResult = {
      ...PRIMARY_SCAN_RESULT,
      id: `scan-demo-${Date.now()}`,
      scannedAt: new Date().toISOString(),
      scanDurationSeconds: Number(((Date.now() - startTime) / 1000).toFixed(1)),
    };

    this.history = [completedScan, ...this.history.slice(0, 7)];

    options.onProgress?.({
      status: ScanStatus.Completed,
      percentComplete: 100,
      currentDirectory: options.targetPath,
      filesScanned: totalFiles,
      bytesAnalysed: totalBytes,
      elapsedMs: Date.now() - startTime,
    });

    return completedScan;
  }

  async inspectItem(
    pathOrId: string,
    snapshotId?: string
  ): Promise<FileMetadata | null> {
    const scan =
      this.history.find((s) => s.id === snapshotId) ?? PRIMARY_SCAN_RESULT;
    return findStorageItemByIdOrPath(scan.rootItem, pathOrId);
  }

  async getScanResults(snapshotId?: string): Promise<ScanResult> {
    if (snapshotId) {
      const match = this.history.find((s) => s.id === snapshotId);
      if (match) return match;
    }
    return this.history[0] ?? PRIMARY_SCAN_RESULT;
  }

  async getScanHistory(): Promise<ScanResult[]> {
    return [...this.history];
  }

  clearHistoryKeepLatest(): ScanResult[] {
    this.history = [this.history[0] ?? PRIMARY_SCAN_RESULT];
    return [...this.history];
  }
}

export const mockFilesystemProvider = new MockFilesystemProvider();
