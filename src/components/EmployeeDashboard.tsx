import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { mockDeliveries, Delivery } from '@/lib/mock-data';
import { Package, LogOut, MapPin, Clock, CheckCircle2, Truck, ChevronRight, ChevronDown } from 'lucide-react';

interface EmployeeDashboardProps {
  onLogout: () => void;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'Em trânsito', icon: Truck, color: 'bg-foreground/10 text-foreground' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
};

const EmployeeDashboard = ({ onLogout }: EmployeeDashboardProps) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(
    mockDeliveries.filter(d => d.employeeId === '2')
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleStatusChange = (id: string, newStatus: Delivery['status']) => {
    setDeliveries(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, status: newStatus, completedAt: newStatus === 'delivered' ? new Date().toISOString() : d.completedAt }
          : d
      )
    );
  };

  const pending = deliveries.filter(d => d.status !== 'delivered').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold">Olá, Carlos 👋</h1>
          <p className="text-sm text-muted-foreground">
            {pending > 0 ? `Você tem ${pending} entrega(s) pendente(s)` : 'Todas entregas concluídas!'}
          </p>
        </div>

        {/* Stats */}
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

        {/* Deliveries */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Minhas Entregas</h2>
          {deliveries.map(delivery => {
            const expanded = expandedId === delivery.id;
            const config = statusConfig[delivery.status];
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
                        {delivery.items.map(item => (
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
                    {delivery.status === 'delivered' && (
                      <div className="text-center text-xs text-muted-foreground">
                        ✅ Entregue em {new Date(delivery.completedAt!).toLocaleString('pt-BR')}
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
