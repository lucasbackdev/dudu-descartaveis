import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Plus, Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { buildReceipt, printViaBluetooth } from '@/lib/thermalPrinter';
import { Delivery } from '@/lib/types';
import { toast } from 'sonner';

interface MissingItem {
  name: string;
  quantity: string;
}

interface DeliveryReceiptPrintProps {
  delivery: Delivery;
  employeeName: string;
  onPrintComplete?: () => void;
}

const DeliveryReceiptPrint = ({ delivery, employeeName, onPrintComplete }: DeliveryReceiptPrintProps) => {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [showMissing, setShowMissing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const addMissingItem = () => setMissingItems([...missingItems, { name: '', quantity: '1' }]);
  const removeMissingItem = (idx: number) => setMissingItems(missingItems.filter((_, i) => i !== idx));
  const updateMissingItem = (idx: number, field: keyof MissingItem, value: string) => {
    const updated = [...missingItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setMissingItems(updated);
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const items = (delivery.delivery_items || []).map(i => ({
        name: i.name,
        quantity: i.quantity,
        sale_price: (i as any).sale_price || 0,
      }));

      const missing = missingItems
        .filter(m => m.name.trim())
        .map(m => ({ name: m.name.trim(), quantity: parseInt(m.quantity) || 1 }));

      const receipt = buildReceipt({
        client: delivery.client,
        address: delivery.address,
        employeeName,
        items,
        missingItems: missing,
        notes: delivery.notes || undefined,
        date: new Date().toLocaleString('pt-BR'),
      });

      const bytes = await receipt.getBytes();
      await printViaBluetooth(bytes);
      toast.success('Nota impressa com sucesso!');
      onPrintComplete?.();
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        toast.info('Impressão cancelada');
      } else {
        toast.error(err.message || 'Erro ao imprimir');
        console.error('Print error:', err);
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Missing items section */}
      <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
        <button
          onClick={() => setShowMissing(!showMissing)}
          className="flex items-center gap-2 text-sm font-semibold w-full text-left"
        >
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span>Itens em falta</span>
          {missingItems.length > 0 && (
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
              {missingItems.filter(m => m.name.trim()).length}
            </span>
          )}
        </button>

        {showMissing && (
          <div className="space-y-2 pt-1">
            {missingItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder="Nome do produto"
                  value={item.name}
                  onChange={(e) => updateMissingItem(idx, 'name', e.target.value)}
                  className="h-9 rounded-full px-4 bg-background border-0 flex-1 text-sm"
                />
                <Input
                  placeholder="Qtd"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateMissingItem(idx, 'quantity', e.target.value)}
                  className="h-9 rounded-full px-3 bg-background border-0 w-16 text-sm"
                />
                <button onClick={() => removeMissingItem(idx)} className="shrink-0">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addMissingItem} className="rounded-full text-xs">
              <Plus className="w-3 h-3 mr-1" /> Adicionar item em falta
            </Button>
          </div>
        )}
      </div>

      {/* Print button */}
      <Button
        onClick={handlePrint}
        disabled={printing}
        variant="outline"
        className="w-full rounded-full h-11 gap-2"
      >
        {printing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        {printing ? 'Imprimindo...' : 'Imprimir Nota'}
      </Button>
    </div>
  );
};

export default DeliveryReceiptPrint;
