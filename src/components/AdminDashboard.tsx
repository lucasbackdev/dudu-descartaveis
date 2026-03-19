import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { mockDeliveries, mockUsers, Delivery, User } from '@/lib/mock-data';
import PerformanceCharts from '@/components/PerformanceCharts';
import {
  Package, LogOut, Users, Truck, CheckCircle2, Clock, MapPin,
  UserCheck, UserX, ChevronDown, ChevronRight, BarChart3, TrendingUp
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'dashboard' | 'deliveries' | 'employees';

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'Em trânsito', icon: Truck, color: 'bg-foreground/10 text-foreground' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]' },
};

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [deliveries] = useState<Delivery[]>(mockDeliveries);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApprove = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, approved: true } : u));
  };

  const handleReject = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const employees = users.filter(u => u.role === 'employee');
  const pendingApproval = employees.filter(u => !u.approved);
  const totalDelivered = deliveries.filter(d => d.status === 'delivered').length;
  const totalPending = deliveries.filter(d => d.status !== 'delivered').length;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'dashboard', label: 'Painel', icon: BarChart3 },
    { key: 'deliveries', label: 'Entregas', icon: Truck },
    { key: 'employees', label: 'Equipe', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-sm">Dudu Descartáveis</span>
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">ADMIN</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-full">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Visão geral das operações</p>
            </div>

            {/* Alert for pending approvals */}
            {pendingApproval.length > 0 && (
              <div className="bg-[hsl(38,92%,50%)]/10 border border-[hsl(38,92%,50%)]/30 rounded-2xl p-4 flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-[hsl(38,92%,50%)]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{pendingApproval.length} funcionário(s) aguardando aprovação</p>
                  <p className="text-xs text-muted-foreground">Vá até a aba Equipe para aprovar</p>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => setTab('employees')}>Ver</Button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total de Entregas', value: deliveries.length, sub: 'hoje' },
                { label: 'Entregues', value: totalDelivered, sub: `${Math.round((totalDelivered / deliveries.length) * 100)}% concluído` },
                { label: 'Pendentes', value: totalPending, sub: 'em andamento' },
                { label: 'Funcionários', value: employees.filter(u => u.approved).length, sub: 'ativos' },
              ].map(s => (
                <div key={s.label} className="bg-secondary rounded-2xl p-4">
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Atividade Recente</h2>
              <div className="space-y-2">
                {deliveries.slice(0, 3).map(d => {
                  const config = statusConfig[d.status];
                  const StatusIcon = config.icon;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.client}</p>
                        <p className="text-xs text-muted-foreground">{d.employeeName} • {config.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Deliveries Tab */}
        {tab === 'deliveries' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Todas as Entregas</h1>
              <p className="text-sm text-muted-foreground">{deliveries.length} entregas registradas</p>
            </div>

            <div className="space-y-3">
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
                        <p className="text-xs text-muted-foreground mt-0.5">📦 {delivery.employeeName}</p>
                      </div>
                      {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold rounded-full px-3 py-1 ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens</p>
                          {delivery.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm py-1">
                              <span>{item.name}</span>
                              <span className="font-semibold text-muted-foreground">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        {delivery.notes && (
                          <div className="bg-secondary rounded-xl p-3">
                            <p className="text-xs text-muted-foreground">📝 {delivery.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Employees Tab */}
        {tab === 'employees' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Gestão de Equipe</h1>
              <p className="text-sm text-muted-foreground">{employees.length} funcionário(s)</p>
            </div>

            {pendingApproval.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Aguardando Aprovação</h2>
                {pendingApproval.map(user => (
                  <div key={user.id} className="bg-card border-2 border-[hsl(38,92%,50%)]/30 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleApprove(user.id)} className="flex-1 rounded-full h-10">
                        <UserCheck className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                      <Button onClick={() => handleReject(user.id)} variant="outline" className="flex-1 rounded-full h-10">
                        <UserX className="w-4 h-4 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Funcionários Ativos</h2>
              {employees.filter(u => u.approved).map(user => {
                const userDeliveries = deliveries.filter(d => d.employeeId === user.id);
                const completed = userDeliveries.filter(d => d.status === 'delivered').length;
                return (
                  <div key={user.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{completed}/{userDeliveries.length}</p>
                        <p className="text-[10px] text-muted-foreground">entregas</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AdminDashboard;
