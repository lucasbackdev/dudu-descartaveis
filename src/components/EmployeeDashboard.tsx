import { useState, useEffect, useRef } from 'react';
import ProductPicker from '@/components/ProductPicker';
import ClientPicker from '@/components/ClientPicker';
import DeliveryReceiptPrint from '@/components/DeliveryReceiptPrint';
import DebtorSearch from '@/components/DebtorSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Delivery } from '@/lib/types';
import {
  Package, LogOut, Clock, CheckCircle2, Truck,
  ChevronRight, ChevronDown, Plus, Trash2, Send, Camera,
  Loader2, RotateCw, CreditCard, Banknote, Smartphone, CalendarDays, FileText, Edit2, X, Download
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface EmployeeDashboardProps {
  profile: Profile;
  onLogout: () => void;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'Em trânsito', icon: Truck, color: 'bg-foreground/10 text-foreground' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
};

interface NewItem {
  name: string;
  quantity: string;
  sale_price: string;
}

const paymentMethods = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { key: 'cartao', label: 'Cartão', icon: CreditCard },
  { key: 'pix', label: 'PIX', icon: Smartphone },
  { key: 'prazo', label: 'A Prazo', icon: CalendarDays },
  { key: 'boleto', label: 'Boleto', icon: FileText },
];

const paymentLabel = (method: string) => {
  const found = paymentMethods.find(p => p.key === method);
  return found ? found.label : method;
};

const getDeliveryTotal = (delivery: Delivery) => {
  return (delivery.delivery_items || []).reduce((sum, item) => sum + (Number((item as any).sale_price) || 0) * item.quantity, 0);
};

const downloadReceipt = (delivery: Delivery, employeeName: string) => {
  const items = delivery.delivery_items || [];
  const total = getDeliveryTotal(delivery);
  let text = `DUDU DESCARTÁVEIS\n`;
  text += `${new Date(delivery.completed_at || delivery.created_at).toLocaleString('pt-BR')}\n`;
  text += `────────────────────────────\n`;
  text += `Cliente: ${delivery.client}\n`;
  text += `Entregador: ${employeeName}\n`;
  if (delivery.notes) text += `Obs: ${delivery.notes}\n`;
  text += `────────────────────────────\n`;
  text += `ITENS ENTREGUES\n`;
  text += `────────────────────────────\n`;
  for (const item of items) {
    const price = Number((item as any).sale_price) || 0;
    text += `${item.name}\n  ${item.quantity}x  R$ ${price.toFixed(2)}  = R$ ${(price * item.quantity).toFixed(2)}\n`;
  }
  text += `────────────────────────────\n`;
  text += `TOTAL: R$ ${total.toFixed(2)}\n`;
  if (delivery.payment_method) {
    text += `────────────────────────────\n`;
    text += `PAGAMENTO: ${paymentLabel(delivery.payment_method)}\n`;
    if ((delivery.payment_method === 'prazo' || delivery.payment_method === 'boleto') && delivery.payment_due_date) {
      text += `VENCIMENTO: ${new Date(delivery.payment_due_date + 'T00:00:00').toLocaleDateString('pt-BR')}\n`;
    }
  }
  text += `────────────────────────────\n`;
  text += `Obrigado pela preferência!\nDudu Descartáveis\n`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nota_${delivery.client.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const EmployeeDashboard = ({ profile, onLogout }: EmployeeDashboardProps) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useOnlineStatus();
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<NewItem[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editPayment, setEditPayment] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [savingEdit, setSavingEdit] = useState(false);

  // New delivery form
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewItem[]>([{ name: '', quantity: '1', sale_price: '' }]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem válida'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB'); return; }

    setUploadingAvatar(true);
    const filePath = `${profile.id}/avatar.${file.name.split('.').pop()}`;
    await supabase.storage.from('avatars').remove([filePath]);
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error('Erro ao enviar foto'); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
    setAvatarUrl(publicUrl + '?t=' + Date.now());
    setUploadingAvatar(false);
    toast.success('Foto de perfil atualizada!');
  };

  const fetchDeliveries = async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('*, delivery_items(*)')
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false });
    setDeliveries((data as Delivery[]) || []);
  };

  useEffect(() => { fetchDeliveries(); }, [profile.id]);

  const handleRefresh = async () => {
    if (!isOnline) { toast.info('Sem conexão.'); return; }
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const [paymentDueDate, setPaymentDueDate] = useState<Date | undefined>();

  const handleStatusChange = async (id: string, newStatus: Delivery['status'], paymentMethod?: string, dueDate?: Date) => {
    if (!isOnline) { toast.error('Você precisa estar conectado à internet para registrar vendas.'); return; }

    const updates: any = { status: newStatus };
    if (newStatus === 'delivered') {
      updates.completed_at = new Date().toISOString();
      if (paymentMethod) updates.payment_method = paymentMethod;
      if ((paymentMethod === 'prazo' || paymentMethod === 'boleto') && dueDate) updates.payment_due_date = format(dueDate, 'yyyy-MM-dd');
    }

    await supabase.from('deliveries').update(updates).eq('id', id);
    setConfirmingDeliveryId(null);
    setSelectedPayment(null);
    setPaymentDueDate(undefined);
    fetchDeliveries();
  };

  const addItem = () => setItems([...items, { name: '', quantity: '1', sale_price: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof NewItem, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const resetForm = () => {
    setClient('');
    setNotes('');
    setItems([{ name: '', quantity: '1', sale_price: '' }]);
    setShowCreate(false);
  };

  const handleSubmitDelivery = async () => {
    if (!isOnline) { toast.error('Você precisa estar conectado à internet para registrar vendas.'); return; }
    if (!client.trim()) { toast.error('Selecione um cliente'); return; }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    setSending(true);
    const validItemsMapped = validItems.map(item => ({
      name: item.name.trim(),
      quantity: parseInt(item.quantity) || 1,
      sale_price: parseFloat(item.sale_price) || 0,
    }));

    const deliveryData = {
      employee_id: profile.id,
      employee_name: profile.name,
      client: client.trim(),
      address: '',
      notes: notes.trim() || '',
      status: 'pending',
    };

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert(deliveryData)
      .select()
      .single();

    if (error || !delivery) { toast.error('Erro ao criar entrega'); setSending(false); return; }

    await supabase.from('delivery_items').insert(
      validItemsMapped.map(item => ({ ...item, delivery_id: delivery.id }))
    );

    setSending(false);
    toast.success('Entrega registrada com sucesso!');
    resetForm();
    fetchDeliveries();
  };

  // Edit delivery
  const startEdit = (delivery: Delivery) => {
    setEditingDeliveryId(delivery.id);
    setEditItems((delivery.delivery_items || []).map(i => ({
      name: i.name,
      quantity: String(i.quantity),
      sale_price: String((i as any).sale_price || 0),
    })));
    setEditNotes(delivery.notes || '');
    setEditPayment(delivery.payment_method || null);
    setEditDueDate(delivery.payment_due_date ? new Date(delivery.payment_due_date + 'T00:00:00') : undefined);
  };

  const saveEdit = async (deliveryId: string) => {
    if (!isOnline) { toast.error('Sem conexão'); return; }
    setSavingEdit(true);

    const updates: any = { notes: editNotes };
    if (editPayment) updates.payment_method = editPayment;
    if ((editPayment === 'prazo' || editPayment === 'boleto') && editDueDate) {
      updates.payment_due_date = format(editDueDate, 'yyyy-MM-dd');
    }
    await supabase.from('deliveries').update(updates).eq('id', deliveryId);

    // Replace items
    await supabase.from('delivery_items').delete().eq('delivery_id', deliveryId);
    const validItems = editItems.filter(i => i.name.trim());
    if (validItems.length > 0) {
      await supabase.from('delivery_items').insert(
        validItems.map(item => ({
          delivery_id: deliveryId,
          name: item.name.trim(),
          quantity: parseInt(item.quantity) || 1,
          sale_price: parseFloat(item.sale_price) || 0,
        }))
      );
    }

    setSavingEdit(false);
    setEditingDeliveryId(null);
    toast.success('Entrega atualizada!');
    fetchDeliveries();
  };

  const pending = deliveries.filter(d => d.status !== 'delivered').length;
  const firstName = profile.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-sm">Dudu Descartáveis</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-full">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Online check banner */}
        {!isOnline && (
          <div className="flex items-center gap-3 rounded-2xl p-4 bg-destructive/10 text-destructive border border-destructive/20">
            <Loader2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Sem conexão</p>
              <p className="text-xs opacity-80">Conecte-se à internet para registrar vendas.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="relative w-16 h-16 rounded-full shrink-0 overflow-hidden bg-secondary border-2 border-border group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">{firstName.charAt(0)}</div>
            )}
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-background" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Olá, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {pending > 0 ? `Você tem ${pending} entrega(s) pendente(s)` : 'Todas entregas concluídas!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="rounded-full" size="sm">
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowCreate(!showCreate)} className="rounded-full" size="sm" disabled={!isOnline}>
              <Plus className="w-4 h-4 mr-1" /> Nova
            </Button>
          </div>
        </div>

        {/* Create delivery form */}
        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Registrar Entrega</h3>
            <ClientPicker value={client} onChange={setClient} />
            <Input
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 rounded-full px-5 bg-secondary border-0"
            />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens da entrega</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <div className="flex-[2] min-w-0">
                    <ProductPicker value={item.name} onChange={(name) => updateItem(idx, 'name', name)} />
                  </div>
                  <Input placeholder="Qtd" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="h-10 rounded-full px-3 bg-secondary border-0 w-14 shrink-0" />
                  <Input placeholder="R$" type="number" min="0" step="0.01" value={item.sale_price} onChange={(e) => updateItem(idx, 'sale_price', e.target.value)} className="h-10 rounded-full px-3 bg-secondary border-0 w-20 shrink-0" />
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="rounded-full h-10 w-10 shrink-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem} className="rounded-full text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar item
              </Button>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSubmitDelivery} disabled={sending || !isOnline} className="flex-1 rounded-full h-11">
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar Entrega'}
              </Button>
              <Button variant="outline" onClick={resetForm} className="rounded-full h-11">Cancelar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pendentes', value: deliveries.filter(d => d.status === 'pending').length },
            { label: 'Em trânsito', value: deliveries.filter(d => d.status === 'in_transit').length },
            { label: 'Entregues', value: deliveries.filter(d => d.status === 'delivered').length },
          ].map(s => (
            <div key={s.label} className="bg-secondary rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <DebtorSearch employeeId={profile.id} />

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Minhas Entregas</h2>
          {deliveries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registrada.</p>
          )}
          {deliveries.map(delivery => {
            const expanded = expandedId === delivery.id;
            const config = statusConfig[delivery.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            const total = getDeliveryTotal(delivery);
            const isEditing = editingDeliveryId === delivery.id;

            return (
              <div key={delivery.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedId(expanded ? null : delivery.id)} className="w-full p-4 flex items-center gap-3 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{delivery.client}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                  {delivery.status === 'delivered' && (
                    <p className="text-sm font-bold text-primary shrink-0">R$ {total.toFixed(2)}</p>
                  )}
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {isEditing ? (
                      /* Edit mode */
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Editar Entrega</p>
                        <Input
                          placeholder="Observações"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="h-10 rounded-full px-4 bg-secondary border-0"
                        />
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Itens</p>
                        {editItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <div className="flex-[2] min-w-0">
                              <ProductPicker value={item.name} onChange={(name) => {
                                const u = [...editItems]; u[idx] = { ...u[idx], name }; setEditItems(u);
                              }} />
                            </div>
                            <Input placeholder="Qtd" type="number" min="1" value={item.quantity} onChange={(e) => {
                              const u = [...editItems]; u[idx] = { ...u[idx], quantity: e.target.value }; setEditItems(u);
                            }} className="h-10 rounded-full px-3 bg-secondary border-0 w-14 shrink-0" />
                            <Input placeholder="R$" type="number" min="0" step="0.01" value={item.sale_price} onChange={(e) => {
                              const u = [...editItems]; u[idx] = { ...u[idx], sale_price: e.target.value }; setEditItems(u);
                            }} className="h-10 rounded-full px-3 bg-secondary border-0 w-20 shrink-0" />
                            {editItems.length > 1 && (
                              <button onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setEditItems([...editItems, { name: '', quantity: '1', sale_price: '' }])} className="rounded-full text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Adicionar item
                        </Button>

                        <p className="text-xs font-semibold text-muted-foreground uppercase">Forma de pagamento</p>
                        <div className="grid grid-cols-3 gap-2">
                          {paymentMethods.map(pm => {
                            const Icon = pm.icon;
                            const active = editPayment === pm.key;
                            return (
                              <button key={pm.key} onClick={() => setEditPayment(pm.key)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-xs font-medium ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                                <Icon className="w-5 h-5" />{pm.label}
                              </button>
                            );
                          })}
                        </div>
                        {(editPayment === 'prazo' || editPayment === 'boleto') && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full rounded-full h-11 justify-start text-left font-normal">
                                <CalendarDays className="w-4 h-4 mr-2" />
                                {editDueDate ? format(editDueDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione a data'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} initialFocus className="p-3 pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                        )}

                        <div className="flex gap-2">
                          <Button onClick={() => saveEdit(delivery.id)} disabled={savingEdit} className="flex-1 rounded-full h-11">
                            {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                          </Button>
                          <Button variant="outline" onClick={() => setEditingDeliveryId(null)} className="rounded-full h-11">Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens da entrega</p>
                          <div className="space-y-2">
                            {delivery.delivery_items?.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.name}</span>
                                <span className="font-semibold text-muted-foreground">
                                  x{item.quantity}
                                  {(item as any).sale_price > 0 && (
                                    <span className="ml-2 text-foreground">R$ {(Number((item as any).sale_price) * item.quantity).toFixed(2)}</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                          {total > 0 && (
                            <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm font-bold">
                              <span>Total</span>
                              <span>R$ {total.toFixed(2)}</span>
                            </div>
                          )}
                        </div>

                        {delivery.notes && (
                          <div className="bg-secondary rounded-xl p-3">
                            <p className="text-xs text-muted-foreground">📝 {delivery.notes}</p>
                          </div>
                        )}

                        {delivery.status === 'pending' && (
                          <Button onClick={() => handleStatusChange(delivery.id, 'in_transit')} className="w-full rounded-full h-11" disabled={!isOnline}>
                            <Truck className="w-4 h-4 mr-2" /> Iniciar Entrega
                          </Button>
                        )}

                        {delivery.status === 'in_transit' && (
                          <div className="space-y-3">
                            {confirmingDeliveryId === delivery.id ? (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Forma de pagamento</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {paymentMethods.map(pm => {
                                    const Icon = pm.icon;
                                    const active = selectedPayment === pm.key;
                                    return (
                                      <button key={pm.key} onClick={() => setSelectedPayment(pm.key)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-xs font-medium ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                                        <Icon className="w-5 h-5" />{pm.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                {(selectedPayment === 'prazo' || selectedPayment === 'boleto') && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground">Data de vencimento</p>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full rounded-full h-11 justify-start text-left font-normal">
                                          <CalendarDays className="w-4 h-4 mr-2" />
                                          {paymentDueDate ? format(paymentDueDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione a data'}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={paymentDueDate} onSelect={setPaymentDueDate} disabled={(date) => date < new Date()} initialFocus className="p-3 pointer-events-auto" />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button onClick={() => {
                                    if (!selectedPayment) { toast.error('Selecione a forma de pagamento'); return; }
                                    if ((selectedPayment === 'prazo' || selectedPayment === 'boleto') && !paymentDueDate) { toast.error('Selecione a data de vencimento'); return; }
                                    handleStatusChange(delivery.id, 'delivered', selectedPayment, paymentDueDate);
                                  }} className="flex-1 rounded-full h-11" disabled={!isOnline}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar
                                  </Button>
                                  <Button variant="outline" onClick={() => { setConfirmingDeliveryId(null); setSelectedPayment(null); setPaymentDueDate(undefined); }} className="rounded-full h-11">Cancelar</Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => setConfirmingDeliveryId(delivery.id)} className="w-full rounded-full h-11" disabled={!isOnline}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Entrega
                              </Button>
                            )}
                          </div>
                        )}

                        {delivery.status === 'delivered' && delivery.completed_at && (
                          <div className="space-y-3">
                            <div className="text-center text-xs text-muted-foreground space-y-1">
                              <p>✅ Entregue em {new Date(delivery.completed_at).toLocaleString('pt-BR')}</p>
                              {delivery.payment_method && (
                                <p className="font-medium">💳 {paymentLabel(delivery.payment_method)}</p>
                              )}
                              {(delivery.payment_method === 'prazo' || delivery.payment_method === 'boleto') && delivery.payment_due_date && (
                                <p className="font-medium">📅 Vencimento: {new Date(delivery.payment_due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => startEdit(delivery)} className="flex-1 rounded-full h-10">
                                <Edit2 className="w-3 h-3 mr-1" /> Editar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => downloadReceipt(delivery, profile.name)} className="flex-1 rounded-full h-10">
                                <Download className="w-3 h-3 mr-1" /> Baixar
                              </Button>
                            </div>
                            <DeliveryReceiptPrint delivery={delivery} employeeName={profile.name} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
