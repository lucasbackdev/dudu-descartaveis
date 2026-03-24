import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Delivery } from '@/lib/types';
import { Package, LogOut, MapPin, Clock, CheckCircle2, Truck, ChevronRight, ChevronDown } from 'lucide-react';

interface EmployeeDashboardProps {
  profile: Profile;
  onLogout: () => void;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'Em trânsito', icon: Truck, color: 'bg-foreground/10 text-foreground' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
};

const EmployeeDashboard = ({ profile, onLogout }: EmployeeDashboardProps) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('*, delivery_items(*)')
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false });
    setDeliveries((data as Delivery[]) || []);
  };

  useEffect(() => { fetchDeliveries(); }, [profile.id]);

  const handleStatusChange = async (id: string, newStatus: Delivery['status']) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'delivered') updates.completed_at = new Date().toISOString();

    await supabase.from('deliveries').update(updates).eq('id', id);
    fetchDeliveries();
  };

  const pending = deliveries.filter(d => d.status !== 'delivered').length;
  const firstName = profile.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-background">
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
        <div>
          <h1 className="text-xl font-bold">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">
            {pending > 0 ? `Você tem ${pending} entrega(s) pendente(s)` : 'Todas entregas concluídas!'}
          </p>
        </div>

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
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega atribuída a você.</p>
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
                      <Button
                        onClick={() => handleStatusChange(delivery.id, 'delivered')}
                        className="w-full rounded-full h-11"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Entrega
                      </Button>
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
