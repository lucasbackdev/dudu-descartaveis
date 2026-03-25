import { useState, useEffect, useCallback } from 'react';
import { syncPendingOperations, getPendingCount } from '@/lib/offlineSync';
import { toast } from 'sonner';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getPendingCount());
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPendingCount());
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sync when back online
      if (getPendingCount() > 0) {
        setSyncing(true);
        const { synced, failed } = await syncPendingOperations();
        setSyncing(false);
        refreshPendingCount();
        if (synced > 0) {
          toast.success(`${synced} operação(ões) sincronizada(s) com sucesso!`);
        }
        if (failed > 0) {
          toast.error(`${failed} operação(ões) falharam ao sincronizar`);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount]);

  return { isOnline, pendingCount, syncing, refreshPendingCount };
}
