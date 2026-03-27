import { useState, useEffect, useRef } from 'react';
import ProductPicker from '@/components/ProductPicker';
import DeliveryReceiptPrint from '@/components/DeliveryReceiptPrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Delivery } from '@/lib/types';
import {
  Package, LogOut, MapPin, Clock, CheckCircle2, Truck,
  ChevronRight, ChevronDown, Plus, Trash2, Send, Camera,
  WifiOff, Loader2, CloudUpload, RotateCw, CreditCard, Banknote, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { addPendingOperation, syncPendingOperations } from '@/lib/offlineSync';
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

const EmployeeDashboard = ({ profile, onLogout }: EmployeeDashboardProps) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline, pendingCount, syncing, refreshPendingCount } = useOnlineStatus();
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  // New delivery form
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewItem[]>([{ name: '', quantity: '1', sale_price: '' }]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingAvatar(true);
    const filePath = `${profile.id}/avatar.${file.name.split('.').pop()}`;

    // Remove old avatar if exists
    await supabase.storage.from('avatars').remove([filePath]);

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error('Erro ao enviar foto');
      setUploadingAvatar(false);
      return;
    }

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
    if (!isOnline) {
      toast.info('Sem conexão. Os dados pendentes serão enviados quando a internet voltar.');
      return;
    }

    setRefreshing(true);

    if (pendingCount > 0) {
      const { synced, failed } = await syncPendingOperations();
      refreshPendingCount();

      if (synced > 0) {
        toast.success(`${synced} operação(ões) sincronizada(s) com sucesso!`);
      }

      if (failed > 0) {
        toast.error(`${failed} operação(ões) falharam ao sincronizar`);
      }
    }

    await fetchDeliveries();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const handleStatusChange = async (id: string, newStatus: Delivery['status'], paymentMethod?: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'delivered') {
      updates.completed_at = new Date().toISOString();
      if (paymentMethod) updates.payment_method = paymentMethod;
    }

    if (!navigator.onLine) {
      addPendingOperation({
        type: 'status_update',
        payload: { id, status: newStatus, completed_at: updates.completed_at, payment_method: updates.payment_method },
      });
      refreshPendingCount();
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      toast.info('Sem conexão. A atualização será enviada quando a internet voltar.');
      return;
    }

    await supabase.from('deliveries').update(updates).eq('id', id);
    setConfirmingDeliveryId(null);
    setSelectedPayment(null);
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
    setAddress('');
    setNotes('');
    setItems([{ name: '', quantity: '1', sale_price: '' }]);
    setShowCreate(false);
  };

  const handleSubmitDelivery = async () => {
    if (!client.trim() || !address.trim()) {
      toast.error('Preencha o cliente e o endereço');
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

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
      address: address.trim(),
      notes: notes.trim() || '',
      status: 'pending',
    };

    if (!navigator.onLine) {
      addPendingOperation({
        type: 'create_delivery',
        payload: { delivery: deliveryData, items: validItemsMapped },
      });
      refreshPendingCount();
      setSending(false);
      toast.info('Sem conexão. A entrega será enviada quando a internet voltar.');
      resetForm();
      return;
    }

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert(deliveryData)
      .select()
      .single();

    if (error || !delivery) {
      toast.error('Erro ao criar entrega');
      setSending(false);
      return;
    }

    const itemsToInsert = validItemsMapped.map(item => ({
      ...item,
      delivery_id: delivery.id,
    }));

    const { error: itemsError } = await supabase
      .from('delivery_items')
      .insert(itemsToInsert);

    setSending(false);

    if (itemsError) {
      toast.error('Entrega criada, mas erro ao adicionar itens');
    } else {
      toast.success('Entrega registrada com sucesso!');
    }

    resetForm();
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
        {/* Offline / Syncing Banner */}
        {(!isOnline || pendingCount > 0) && (
          <div className={`flex items-center gap-3 rounded-2xl p-4 ${
            !isOnline 
              ? 'bg-destructive/10 text-destructive border border-destructive/20' 
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            {!isOnline ? (
              <WifiOff className="w-5 h-5 shrink-0" />
            ) : syncing ? (
              <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
            ) : (
              <CloudUpload className="w-5 h-5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {!isOnline ? (
                <>
                  <p className="text-sm font-semibold">Sem conexão</p>
                  <p className="text-xs opacity-80">
                    {pendingCount > 0 
                      ? `${pendingCount} operação(ões) pendente(s). Serão enviadas quando a conexão for restabelecida.`
                      : 'Você pode continuar registrando entregas. Os dados serão enviados automaticamente.'}
                  </p>
                </>
              ) : syncing ? (
                <>
                  <p className="text-sm font-semibold">Sincronizando...</p>
                  <p className="text-xs opacity-80">Enviando dados pendentes ao servidor.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">Dados pendentes</p>
                  <p className="text-xs opacity-80">{pendingCount} operação(ões) aguardando sincronização.</p>
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-16 h-16 rounded-full shrink-0 overflow-hidden bg-secondary border-2 border-border group"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                {firstName.charAt(0)}
              </div>
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
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing || syncing} className="rounded-full" size="sm">
              <RotateCw className={`w-4 h-4 ${refreshing || syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowCreate(!showCreate)} className="rounded-full" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nova
            </Button>
          </div>
        </div>

        {/* Create delivery form */}
        {showCreate && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Registrar Entrega</h3>
            <Input
              placeholder="Nome do cliente"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="h-11 rounded-full px-5 bg-secondary border-0"
            />
            <Input
              placeholder="Endereço"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-11 rounded-full px-5 bg-secondary border-0"
            />
            <Input
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 rounded-full px-5 bg-secondary border-0"
            />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens da entrega</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2 flex-wrap">
                  <ProductPicker
                    value={item.name}
                    onChange={(name) => updateItem(idx, 'name', name)}
                  />
                  <Input
                    placeholder="Qtd"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    className="h-10 rounded-full px-4 bg-secondary border-0 w-20"
                  />
                  <Input
                    placeholder="R$ Valor"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.sale_price}
                    onChange={(e) => updateItem(idx, 'sale_price', e.target.value)}
                    className="h-10 rounded-full px-4 bg-secondary border-0 w-28"
                  />
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
              <Button onClick={handleSubmitDelivery} disabled={sending} className="flex-1 rounded-full h-11">
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar Entrega'}
              </Button>
              <Button variant="outline" onClick={resetForm} className="rounded-full h-11">
                Cancelar
              </Button>
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

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Minhas Entregas</h2>
          {deliveries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registrada. Clique em "Nova" para começar.</p>
          )}
          {deliveries.map(delivery => {
            const expanded = expandedId === delivery.id;
            const config = statusConfig[delivery.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;

            return (
              <div key={delivery.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : delivery.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{delivery.client}</p>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <p className="text-xs truncate">{delivery.address}</p>
                    </div>
                  </div>
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens da entrega</p>
                      <div className="space-y-2">
                        {delivery.delivery_items?.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.name}</span>
                            <span className="font-semibold text-muted-foreground">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {delivery.notes && (
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">📝 {delivery.notes}</p>
                      </div>
                    )}

                    {delivery.status === 'pending' && (
                      <Button
                        onClick={() => handleStatusChange(delivery.id, 'in_transit')}
                        className="w-full rounded-full h-11"
                      >
                        <Truck className="w-4 h-4 mr-2" /> Iniciar Entrega
                      </Button>
                    )}
                    {delivery.status === 'in_transit' && (
                      <div className="space-y-3">
                        <DeliveryReceiptPrint
                          delivery={delivery}
                          employeeName={profile.name}
                        />
                        <Button
                          onClick={() => handleStatusChange(delivery.id, 'delivered')}
                          className="w-full rounded-full h-11"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Entrega
                        </Button>
                      </div>
                    )}
                    {delivery.status === 'delivered' && delivery.completed_at && (
                      <div className="text-center text-xs text-muted-foreground">
                        ✅ Entregue em {new Date(delivery.completed_at).toLocaleString('pt-BR')}
                      </div>
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
