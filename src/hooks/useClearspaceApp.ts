import { useCallback, useEffect, useRef, useState } from 'react';
import { clearspaceBackend } from '../services/backend';
import { mockFilesystemProvider } from '../services/filesystem/mockProvider';
import { tauriFilesystemProvider, TauriFilesystemProvider } from '../services/filesystem/tauriProvider';
import { PRIMARY_SCAN_RESULT } from '../services/filesystem/mockData';
import {
  findStorageItemByIdOrPath,
  ScanSimulationScenario,
} from '../services/filesystem/types';
import {
  AppSettings,
  CleanupRecommendation,
  FileMetadata,
  NavSection,
  ScanProgress,
  ScanResult,
  ScanStatus,
  StorageItem,
} from '../types/storage';

const SETTINGS_STORAGE_KEY = 'clearspace.settings.v1';

const DEFAULT_SETTINGS: AppSettings = {
  appearance: 'dark',
  storageUnits: 'decimal',
  defaultScanLocation: '',
  excludedFolders: [
    '~/.ssh',
    '~/.gnupg',
    '~/.aws',
    '~/.config',
  ],
  maxScanDepth: 'unlimited',
  includeHiddenFiles: true,
  symlinkHandling: 'ignore',
  localOnlyConfirmed: true,
  scanHistoryRetention: '90d',
  telemetryEnabled: false,
  requireReviewChecklist: true,
  requireTypedConfirmationOver10GB: true,
  moveToTrashInsteadOfPermanent: true,
  protectGitUncommitted: true,
  protectEnvFiles: true,
  protectDockerVolumes: true,
};

function loadInitialSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      telemetryEnabled: false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useClearspaceApp() {
  const isNative = TauriFilesystemProvider.isTauriRuntimeAvailable();
  const activeProvider = isNative ? tauriFilesystemProvider : mockFilesystemProvider;

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [currentScan, setCurrentScan] = useState<ScanResult>(PRIMARY_SCAN_RESULT);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);

  // Explorer navigation state
  const [explorerFocusId, setExplorerFocusId] = useState<string>(
    PRIMARY_SCAN_RESULT.rootItem.id
  );

  // Inspection drawer & cleanup review modal
  const [inspectedItem, setInspectedItem] = useState<StorageItem | FileMetadata | null>(
    null
  );
  const [reviewingRecommendation, setReviewingRecommendation] =
    useState<CleanupRecommendation | null>(null);

  // Scanning state
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [scanScenario, setScanScenario] =
    useState<ScanSimulationScenario>('normal');
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    status: ScanStatus.Idle,
    percentComplete: 0,
    currentDirectory: settings.defaultScanLocation,
    filesScanned: 0,
    bytesAnalysed: 0,
    elapsedMs: 0,
  });
  const scanAbortRef = useRef<AbortController | null>(null);

  // Quick search (Cmd+K) & transient toast
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Load initial settings and history from native SQLite when in Tauri mode
  useEffect(() => {
    if (isNative) {
      clearspaceBackend.loadAppSettings().then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setSettings((prev) => ({ ...prev, ...parsed, telemetryEnabled: false }));
          } catch (e) {
            console.error('Failed to parse SQLite settings:', e);
          }
        }
      });
    }

    activeProvider.getScanHistory().then((history) => {
      if (history.length > 0) {
        setScanHistory(history);
      }
    });
  }, [activeProvider, isNative]);

  // Sync theme to document root and persist settings (SQLite in desktop, localStorage in browser)
  useEffect(() => {
    const rootEl = document.documentElement;
    rootEl.setAttribute('data-theme', settings.appearance);
    if (settings.appearance === 'light') {
      rootEl.classList.remove('dark');
    } else {
      rootEl.classList.add('dark');
    }

    if (isNative) {
      clearspaceBackend.saveAppSettings(JSON.stringify(settings)).catch(console.error);
    } else {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage quota errors in sandboxed environments
      }
    }
  }, [isNative, settings]);

  // Global keyboard shortcuts: Cmd/Ctrl+K for quick search, Escape to close drawers/modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isQuickSearchOpen) {
          setIsQuickSearchOpen(false);
        } else if (reviewingRecommendation) {
          setReviewingRecommendation(null);
        } else if (inspectedItem) {
          setInspectedItem(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedItem, isQuickSearchOpen, reviewingRecommendation]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      telemetryEnabled: false,
    }));
  }, []);

  const toggleExcludePath = useCallback(
    (targetPath: string) => {
      setSettings((prev) => {
        const exists = prev.excludedFolders.includes(targetPath);
        const nextList = exists
          ? prev.excludedFolders.filter((p) => p !== targetPath)
          : [...prev.excludedFolders, targetPath];
        showToast(
          exists
            ? `Removed ${targetPath} from scan exclusions`
            : `Excluded ${targetPath} from future scans`
        );
        return {
          ...prev,
          excludedFolders: nextList,
        };
      });
    },
    [showToast]
  );

  const inspectByIdOrPath = useCallback(
    async (idOrPath: string) => {
      const found = findStorageItemByIdOrPath(currentScan.rootItem, idOrPath);
      if (found) {
        setInspectedItem(found);
      } else {
        const liveMeta = await activeProvider.inspectItem(idOrPath);
        if (liveMeta) {
          setInspectedItem(liveMeta);
        } else {
          showToast(`Metadata loaded from snapshot for ${idOrPath}`);
        }
      }
    },
    [activeProvider, currentScan.rootItem, showToast]
  );

  const navigateToFolderInExplorer = useCallback(
    (itemIdOrPath: string) => {
      const found = findStorageItemByIdOrPath(currentScan.rootItem, itemIdOrPath);
      if (found) {
        if (found.children && found.children.length > 0) {
          setExplorerFocusId(found.id);
        } else {
          // Focus parent if leaf item
          setExplorerFocusId(currentScan.rootItem.id);
          setInspectedItem(found);
        }
        setActiveSection('explorer');
      }
    },
    [currentScan.rootItem]
  );

  const selectScanDirectory = useCallback(async (): Promise<string | null> => {
    try {
      const chosen = await activeProvider.selectDirectory(settings.defaultScanLocation);
      if (chosen) {
        updateSettings({ defaultScanLocation: chosen });
        showToast(`Scan folder: ${chosen}`);
        return chosen;
      }
      return null;
    } catch (e) {
      console.error('Directory selection error:', e);
      return null;
    }
  }, [activeProvider, settings.defaultScanLocation, showToast, updateSettings]);

  const startScan = useCallback(
    async (scenarioOverride?: ScanSimulationScenario, pathOverride?: string) => {
      const activeScenario = scenarioOverride ?? scanScenario;
      if (scenarioOverride) {
        setScanScenario(scenarioOverride);
      }

      const targetPath =
        pathOverride ||
        (activeScenario === 'empty'
          ? '~/Projects/new-empty-workspace'
          : settings.defaultScanLocation);

      if (scanAbortRef.current) {
        scanAbortRef.current.abort();
      }
      const controller = new AbortController();
      scanAbortRef.current = controller;

      setIsScanModalOpen(true);
      setScanProgress({
        status: ScanStatus.Scanning,
        percentComplete: 2,
        currentDirectory: targetPath,
        filesScanned: 0,
        bytesAnalysed: 0,
        elapsedMs: 0,
      });

      try {
        const result = await activeProvider.scanDirectory({
          targetPath,
          excludedFolders: settings.excludedFolders,
          includeHiddenFiles: settings.includeHiddenFiles,
          maxDepth: settings.maxScanDepth,
          symlinkHandling: settings.symlinkHandling,
          scenario: activeScenario,
          signal: controller.signal,
          onProgress: (p) => setScanProgress(p),
        });

        setCurrentScan(result);
        setExplorerFocusId(result.rootItem.id);
        const updatedHistory = await activeProvider.getScanHistory();
        setScanHistory(updatedHistory);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setScanProgress((prev) => ({
            ...prev,
            status: ScanStatus.Idle,
          }));
          setIsScanModalOpen(false);
          showToast('Scan cancelled');
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setScanProgress((prev) => ({
            ...prev,
            status: message.includes('Permission') ? ScanStatus.PermissionDenied : ScanStatus.Failed,
            errorMessage: message,
          }));
        }
      }
    },
    [activeProvider, scanScenario, settings, showToast]
  );

  const cancelScan = useCallback(() => {
    if (scanAbortRef.current) {
      scanAbortRef.current.abort();
      scanAbortRef.current = null;
    }
    setIsScanModalOpen(false);
  }, []);

  const restorePrimaryDemoDataset = useCallback(() => {
    setCurrentScan(PRIMARY_SCAN_RESULT);
    setExplorerFocusId(PRIMARY_SCAN_RESULT.rootItem.id);
    setScanScenario('normal');
    setIsScanModalOpen(false);
    showToast('Restored primary Macintosh HD demo dataset');
  }, [showToast]);

  const loadHistoricalSnapshot = useCallback(
    (snapshotId: string) => {
      const target = scanHistory.find((s) => s.id === snapshotId);
      if (target) {
        setCurrentScan(target);
        setExplorerFocusId(target.rootItem.id);
        showToast(`Loaded snapshot from ${new Date(target.scannedAt).toLocaleDateString()}`);
      }
    },
    [scanHistory, showToast]
  );

  const clearOldHistory = useCallback(async () => {
    if (!isNative) {
      const remaining = mockFilesystemProvider.clearHistoryKeepLatest();
      setScanHistory(remaining);
    } else {
      await tauriFilesystemProvider.clearHistory();
      setScanHistory([]);
    }
    showToast('Cleared historical scan snapshots');
  }, [isNative, showToast]);

  const executeCleanup = useCallback(
    async (rec: CleanupRecommendation): Promise<boolean> => {
      if (!isNative) {
        showToast('Native cleanup is only available in macOS desktop mode.');
        return false;
      }
      try {
        const res = await clearspaceBackend.moveToTrash(rec.path);
        if (!res.success) {
          showToast(`Cleanup refused: ${res.errorMessage || 'Could not move to Trash'}`);
          return false;
        }

        showToast(`Moved ${rec.artifactName} to macOS Trash`);

        // Update currentScan state: remove cleaned recommendation and adjust numbers
        setCurrentScan((prev) => {
          const nextRecs = prev.recommendations.filter((r) => r.id !== rec.id);
          const nextArtifacts = prev.artifacts.filter((a) => a.path !== rec.path);
          return {
            ...prev,
            recoverableBytes: Math.max(0, prev.recoverableBytes - rec.sizeBytes),
            usedBytes: Math.max(0, prev.usedBytes - rec.sizeBytes),
            availableBytes: prev.availableBytes + rec.sizeBytes,
            recommendations: nextRecs,
            artifacts: nextArtifacts,
          };
        });

        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Cleanup error: ${msg}`);
        return false;
      }
    },
    [isNative, showToast]
  );

  return {
    isNativeBackend: isNative,
    executeCleanup,
    activeSection,
    setActiveSection,
    currentScan,
    scanHistory,
    settings,
    updateSettings,
    toggleExcludePath,
    explorerFocusId,
    setExplorerFocusId,
    navigateToFolderInExplorer,
    inspectedItem,
    setInspectedItem,
    inspectByIdOrPath,
    reviewingRecommendation,
    setReviewingRecommendation,
    isScanModalOpen,
    setIsScanModalOpen,
    scanScenario,
    setScanScenario,
    scanProgress,
    selectScanDirectory,
    startScan,
    cancelScan,
    restorePrimaryDemoDataset,
    loadHistoricalSnapshot,
    clearOldHistory,
    isQuickSearchOpen,
    setIsQuickSearchOpen,
    toastMessage,
    showToast,
  };
}
