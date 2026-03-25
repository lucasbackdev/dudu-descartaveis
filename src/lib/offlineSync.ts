import { supabase } from '@/integrations/supabase/client';

interface PendingOperation {
  id: string;
  type: 'status_update' | 'create_delivery';
  payload: any;
  timestamp: number;
}

const STORAGE_KEY = 'offline_pending_operations';

function getPendingOps(): PendingOperation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingOps(ops: PendingOperation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

export function addPendingOperation(op: Omit<PendingOperation, 'id' | 'timestamp'>) {
  const ops = getPendingOps();
  ops.push({
    ...op,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  savePendingOps(ops);
}

export function getPendingCount(): number {
  return getPendingOps().length;
}

export async function syncPendingOperations(): Promise<{ synced: number; failed: number }> {
  const ops = getPendingOps();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  const remaining: PendingOperation[] = [];

  for (const op of ops) {
    try {
      if (op.type === 'status_update') {
        const { id, status, completed_at } = op.payload;
        const updates: any = { status };
        if (completed_at) updates.completed_at = completed_at;
        const { error } = await supabase.from('deliveries').update(updates).eq('id', id);
        if (error) throw error;
        synced++;
      } else if (op.type === 'create_delivery') {
        const { delivery, items } = op.payload;
        const { data, error } = await supabase.from('deliveries').insert(delivery).select().single();
        if (error) throw error;
        if (items?.length && data) {
          const itemsToInsert = items.map((item: any) => ({ ...item, delivery_id: data.id }));
          await supabase.from('delivery_items').insert(itemsToInsert);
        }
        synced++;
      }
    } catch {
      remaining.push(op);
    }
  }

  savePendingOps(remaining);
  return { synced, failed: remaining.length };
}
