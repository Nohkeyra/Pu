import { lazy, Suspense } from 'react';
import { useInAppUpdates } from '@/hooks/useInAppUpdates';

const InAppUpdateModal = lazy(() => import('./InAppUpdateModal'));
const InAppUpdateBanner = lazy(() => import('./InAppUpdateBanner'));

export default function GlobalInAppUpdateHandler() {
  const { 
    currentVersion,
    updateAvailable, 
    showNotificationBanner, 
    latestConfig, 
    isForceUpdate, 
    dismissUpdate, 
    dismissNotificationBanner, 
    showUpdateModalManually 
  } = useInAppUpdates();

  return (
    <Suspense fallback={null}>
      <InAppUpdateBanner
        visible={showNotificationBanner && !updateAvailable}
        config={latestConfig}
        onOpenModal={showUpdateModalManually}
        onDismiss={dismissNotificationBanner}
      />
      <InAppUpdateModal
        isOpen={updateAvailable}
        config={latestConfig}
        currentVersion={currentVersion}
        isForceUpdate={isForceUpdate}
        onDismiss={dismissUpdate}
      />
    </Suspense>
  );
}
