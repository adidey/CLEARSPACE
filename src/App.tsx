/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { InspectionDrawer } from './components/InspectionDrawer';
import { OnboardingModal } from './components/OnboardingModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DeveloperArtifactsView } from './features/artifacts/DeveloperArtifactsView';
import { CleanupReviewModal } from './features/cleanup/CleanupReviewModal';
import { StorageExplorerView } from './features/explorer/StorageExplorerView';
import { HelpDocumentationView } from './features/help/HelpDocumentationView';
import { ScanHistoryView } from './features/history/ScanHistoryView';
import { OverviewView } from './features/overview/OverviewView';
import { CleanupRecommendationsView } from './features/recommendations/CleanupRecommendationsView';
import { ScanExperienceModal } from './features/scanning/ScanExperienceModal';
import { SettingsView } from './features/settings/SettingsView';
import { useClearspaceApp } from './hooks/useClearspaceApp';
import { StorageItem } from './types/storage';

export default function App() {
  const {
    isNativeBackend,
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
  } = useClearspaceApp();

  const handleInspectItemOrId = (itemOrId: StorageItem | string) => {
    if (typeof itemOrId === 'string') {
      inspectByIdOrPath(itemOrId);
    } else {
      setInspectedItem(itemOrId);
    }
  };

  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('clearspace.onboarded.v1')
  );

  const handleOnboardingDismiss = () => {
    localStorage.setItem('clearspace.onboarded.v1', '1');
    setShowOnboarding(false);
  };

  const handleTriggerScan = async () => {
    if (isNativeBackend) {
      const chosen = await selectScanDirectory();
      if (chosen) {
        await startScan('normal', chosen);
      }
    } else {
      await startScan('normal');
    }
  };

  const handleOnboardingSelectAndScan = async () => {
    localStorage.setItem('clearspace.onboarded.v1', '1');
    setShowOnboarding(false);
    await handleTriggerScan();
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden flex select-none"
      style={{
        backgroundColor: 'var(--cs-bg)',
        color: 'var(--cs-text)',
      }}
    >
      {/* Persistent Left macOS Utility Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        currentScan={currentScan}
        scanStatus={scanProgress.status}
        unitMode={settings.storageUnits}
        recommendationCount={currentScan.recommendations.length}
        artifactCount={currentScan.artifacts.length}
      />

      {/* Primary Workspace Column */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <TopHeader
          activeSection={activeSection}
          currentScan={currentScan}
          onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
          onStartScan={handleTriggerScan}
        />

        {/* Content + Optional Inspection Drawer Split */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main
            className={`flex-1 min-w-0 select-text ${
              activeSection === 'explorer'
                ? 'overflow-hidden'
                : 'overflow-y-auto'
            }`}
          >
            {activeSection === 'overview' && (
              <OverviewView
                scan={currentScan}
                unitMode={settings.storageUnits}
                excludedFolders={settings.excludedFolders}
                onStartScan={handleTriggerScan}
                onRestoreDemo={restorePrimaryDemoDataset}
                onNavigate={setActiveSection}
                onInspectItem={handleInspectItemOrId}
                onReviewRecommendation={setReviewingRecommendation}
                onExploreDirectory={navigateToFolderInExplorer}
              />
            )}

            {activeSection === 'explorer' && (
              <StorageExplorerView
                rootItem={currentScan.rootItem}
                focusedId={explorerFocusId}
                selectedItemId={inspectedItem?.id}
                unitMode={settings.storageUnits}
                excludedFolders={settings.excludedFolders}
                onFocusDirectory={setExplorerFocusId}
                onInspectItem={setInspectedItem}
              />
            )}

            {activeSection === 'artifacts' && (
              <DeveloperArtifactsView
                artifacts={currentScan.artifacts}
                unitMode={settings.storageUnits}
                excludedFolders={settings.excludedFolders}
                onInspectItemId={inspectByIdOrPath}
              />
            )}

            {activeSection === 'recommendations' && (
              <CleanupRecommendationsView
                recommendations={currentScan.recommendations}
                unitMode={settings.storageUnits}
                excludedFolders={settings.excludedFolders}
                onInspectItem={inspectByIdOrPath}
                onToggleExclude={toggleExcludePath}
                onReviewCleanup={setReviewingRecommendation}
              />
            )}

            {activeSection === 'history' && (
              <ScanHistoryView
                history={scanHistory}
                activeScanId={currentScan.id}
                unitMode={settings.storageUnits}
                onSelectSnapshot={loadHistoricalSnapshot}
                onNavigate={setActiveSection}
                onStartNewScan={() => startScan('normal')}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={updateSettings}
                onToggleExclude={toggleExcludePath}
                onClearHistory={clearOldHistory}
              />
            )}

            {activeSection === 'help' && <HelpDocumentationView />}
          </main>

          {/* Reusable Right-Side File Inspection Drawer */}
          <InspectionDrawer
            item={inspectedItem}
            unitMode={settings.storageUnits}
            excludedFolders={settings.excludedFolders}
            onClose={() => setInspectedItem(null)}
            onToggleExclude={toggleExcludePath}
            onViewContents={(itemId) => {
              navigateToFolderInExplorer(itemId);
            }}
            onCopySuccess={showToast}
          />
        </div>
      </div>

      {/* Non-Destructive Cleanup Review Modal */}
      <CleanupReviewModal
        recommendation={reviewingRecommendation}
        unitMode={settings.storageUnits}
        isExcluded={
          reviewingRecommendation
            ? settings.excludedFolders.includes(reviewingRecommendation.path)
            : false
        }
        onClose={() => setReviewingRecommendation(null)}
        onInspect={inspectByIdOrPath}
        onToggleExclude={toggleExcludePath}
        onCopyCommand={showToast}
        isNative={isNativeBackend}
        onExecuteCleanup={executeCleanup}
      />

      {/* Realistic Scan Simulation & Diagnostic Experience */}
      <ScanExperienceModal
        isOpen={isScanModalOpen}
        progress={scanProgress}
        scenario={scanScenario}
        unitMode={settings.storageUnits}
        onChangeScenario={setScanScenario}
        onStartScan={startScan}
        onCancelScan={cancelScan}
        onCloseCompleted={() => setIsScanModalOpen(false)}
        isNative={isNativeBackend}
        onSelectFolder={handleTriggerScan}
      />

      {/* Raycast-Style Quick Jump Search (Cmd+K) */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        rootItem={currentScan.rootItem}
        unitMode={settings.storageUnits}
        onClose={() => setIsQuickSearchOpen(false)}
        onSelectInspect={setInspectedItem}
        onOpenInExplorer={navigateToFolderInExplorer}
      />

      {/* First-Launch Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onSelectAndScan={handleOnboardingSelectAndScan}
          onDismiss={handleOnboardingDismiss}
        />
      )}

      {/* Transient Desktop Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-6 z-50 px-3.5 py-2 rounded-lg border shadow-xl text-xs font-medium pointer-events-none"
          style={{
            backgroundColor: 'var(--cs-surface-elevated)',
            borderColor: 'var(--cs-border)',
            color: 'var(--cs-text)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
