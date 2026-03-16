import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, X, CheckCircle } from 'lucide-react';

interface SyncMessage {
  type: string;
  message?: string;
  synced?: number;
  failed?: number;
  count?: number;
}

export default function OfflineSyncBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Trigger sync when back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'FORCE_SYNC' });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    const handleSWMessage = (event: MessageEvent) => {
      const data = event.data as SyncMessage;

      switch (data.type) {
        case 'OFFLINE_QUEUED':
          setQueuedCount(prev => prev + 1);
          setShowBanner(true);
          break;

        case 'SYNC_COMPLETE':
          if (data.synced && data.synced > 0) {
            setSyncMessage(data.message || `${data.synced} action(s) synced`);
            setQueuedCount(prev => Math.max(0, prev - (data.synced || 0)));
            setTimeout(() => {
              setSyncMessage(null);
              if (!isOffline && queuedCount <= 0) setShowBanner(false);
            }, 4000);
          }
          break;

        case 'QUEUE_STATUS':
          setQueuedCount(data.count || 0);
          if (data.count && data.count > 0) setShowBanner(true);
          break;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      // Check queue status on mount
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_QUEUE_STATUS' });
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [isOffline, queuedCount]);

  if (!showBanner && !isOffline && !syncMessage) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Offline banner */}
      {isOffline && showBanner && (
        <div className="flex items-center gap-3 bg-amber-600 text-white px-4 py-3 rounded-xl shadow-lg mb-2">
          <WifiOff className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">You're offline</p>
            <p className="text-xs opacity-80">
              {queuedCount > 0
                ? `${queuedCount} action${queuedCount !== 1 ? 's' : ''} queued for sync`
                : 'Changes will sync when back online'}
            </p>
          </div>
          <button onClick={() => setShowBanner(false)} className="shrink-0 p-1 hover:bg-amber-700 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Queued items (when online but still syncing) */}
      {!isOffline && queuedCount > 0 && showBanner && (
        <div className="flex items-center gap-3 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg mb-2">
          <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Syncing...</p>
            <p className="text-xs opacity-80">{queuedCount} action{queuedCount !== 1 ? 's' : ''} remaining</p>
          </div>
        </div>
      )}

      {/* Sync complete toast */}
      {syncMessage && (
        <div className="flex items-center gap-3 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{syncMessage}</p>
        </div>
      )}
    </div>
  );
}
