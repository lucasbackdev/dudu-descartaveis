import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Delivery } from '@/lib/types';
import { toast } from 'sonner';
import { X, Plus, Trash2, Save, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ItemEdit { id?: string; name: string; quantity: string; sale_price: string; }

const PAYMENT_METHODS = [
  { key: 'dinheiro', label: 'Dinheiro' },
  { key: 'pix', label: 'PIX' },
  { key: 'cartao', label: 'Cartão' },
  { key: 'prazo', label: 'A Prazo' },
  { key: 'boleto', label: 'Boleto' },
];

interface Props {
  delivery: Delivery;
  onClose: () => void;
  onSaved: () => void;
}

const AdminEditDelivery = ({ delivery, onClose, onSaved }: Props) => {
  const [client, setClient] = useState(delivery.client);
  const [notes, setNotes] = useState(delivery.notes || '');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(delivery.payment_method || null);
  const [dueDate, setDueDate] = useState<Date | undefined>(delivery.payment_due_date ? new Date(delivery.payment_due_date + 'T00:00:00') : undefined);
  const [items, setItems] = useState<ItemEdit[]>(
    (delivery.delivery_items || []).map(i => ({
      id: i.id,
      name: i.name,
      quantity: String(i.quantity),
      sale_price: String((i as any).sale_price ?? 0),
    }))
  );
  const [saving, setSaving] = useState(false);

  const updateItem = (idx: number, field: keyof ItemEdit, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
  const addItem = () => setItems(prev => [...prev, { name: '', quantity: '1', sale_price: '0' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!client.trim()) { toast.error('Cliente obrigatório'); return; }
    const validItems = items.filter(it => it.name.trim());
    if (validItems.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    setSaving(true);
    const updates: any = {
      client: client.trim(),
      notes: notes.trim(),
      payment_method: paymentMethod,
      payment_due_date: ((paymentMethod === 'prazo' || paymentMethod === 'boleto') && dueDate) ? format(dueDate, 'yyyy-MM-dd') : null,
    };
    const { error: updErr } = await supabase.from('deliveries').update(updates).eq('id', delivery.id);
    if (updErr) { setSaving(false); toast.error('Erro ao salvar nota'); return; }

    // Replace items
    await supabase.from('delivery_items').delete().eq('delivery_id', delivery.id);
    const rows = validItems.map(it => ({
      delivery_id: delivery.id,
      name: it.name.trim(),
      quantity: parseInt(it.quantity) || 1,
      sale_price: parseFloat((it.sale_price || '0').replace(',', '.')) || 0,
    }));
    const { error: insErr } = await supabase.from('delivery_items').insert(rows);
    setSaving(false);
    if (insErr) { toast.error('Erro ao salvar itens'); return; }
    toast.success('Nota atualizada!');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold">Editar Nota</h2>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Cliente</label>
            <Input value={client} onChange={e => setClient(e.target.value)} className="h-10 rounded-full bg-secondary border-0" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Observações</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="rounded-2xl bg-secondary border-0" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Forma de Pagamento</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPaymentMethod(null)} className={`text-xs px-3 py-1.5 rounded-full border ${!paymentMethod ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>Nenhum</button>
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.key} onClick={() => setPaymentMethod(pm.key)} className={`text-xs px-3 py-1.5 rounded-full border ${paymentMethod === pm.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>{pm.label}</button>
              ))}
            </div>
          </div>
          {(paymentMethod === 'prazo' || paymentMethod === 'boleto') && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data de Vencimento</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn("h-10 rounded-full bg-secondary border-0 w-full px-4 text-left text-sm flex items-center gap-2", !dueDate && "text-muted-foreground")}>
                    <CalendarDays className="w-4 h-4" />
                    {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-none" align="start">
                  <Calendar mode="single" locale={ptBR} selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Itens</label>
              <Button size="sm" variant="outline" onClick={addItem} className="rounded-full h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="bg-secondary rounded-2xl p-3 space-y-2">
                  <Input placeholder="Nome" value={it.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="h-9 rounded-full bg-background border-0 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Qtd" value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="h-9 rounded-full bg-background border-0 text-sm" />
                    <Input type="number" step="0.01" placeholder="Preço unit." value={it.sale_price} onChange={e => updateItem(idx, 'sale_price', e.target.value)} className="h-9 rounded-full bg-background border-0 text-sm" />
                  </div>
                  <button onClick={() => removeItem(idx)} className="text-xs text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" />Remover</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border p-3 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-full h-11">Cancelar</Button>
          <Button onClick={save} disabled={saving} className="flex-1 rounded-full h-11"><Save className="w-4 h-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminEditDelivery;
