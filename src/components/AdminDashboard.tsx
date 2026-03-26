import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Delivery } from '@/lib/types';
import PerformanceCharts from '@/components/PerformanceCharts';
import {
  Package, LogOut, Users, Truck, CheckCircle2, Clock, MapPin,
  UserCheck, UserX, ChevronDown, ChevronRight, BarChart3, TrendingUp, UserPlus, RefreshCw, Trash2, BoxesIcon, Search
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'dashboard' | 'deliveries' | 'employees' | 'performance' | 'stock';

interface Product {
  id: string;
  code: string;
  name: string;
  stock: number;
  cost_price: number;
  sale_price: number;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'Em trânsito', icon: Truck, color: 'bg-foreground/10 text-foreground' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
};

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const fetchData = async () => {
    const [{ data: profiles }, { data: dels }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'employee'),
      supabase.from('deliveries').select('*, delivery_items(*)').order('created_at', { ascending: false }),
    ]);
    setEmployees((profiles as Profile[]) || []);
    setDeliveries((dels as Delivery[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (userId: string) => {
    await supabase.from('profiles').update({ approved: true }).eq('id', userId);
    fetchData();
    toast.success('Funcionário aprovado!');
  };

  const handleReject = async (userId: string) => {
    await supabase.from('profiles').update({ approved: false }).eq('id', userId);
    fetchData();
    toast.success('Funcionário rejeitado.');
  };

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (newEmployee.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await supabase.functions.invoke('create-employee', {
      body: { 
        name: newEmployee.name, 
        email: newEmployee.email, 
        password: newEmployee.password 
      },
    });

    setCreating(false);

    if (response.error || response.data?.error) {
      toast.error(response.data?.error || response.error?.message || 'Erro ao criar funcionário');
      return;
    }

    toast.success(`Funcionário ${newEmployee.name} criado com sucesso!`);
    setNewEmployee({ name: '', email: '', password: '' });
    setShowCreateEmployee(false);
    fetchData();
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a conta de ${employeeName}? Os dados de entrega serão mantidos.`)) return;
    
    setDeletingId(employeeId);
    const response = await supabase.functions.invoke('delete-employee', {
      body: { employee_id: employeeId },
    });
    setDeletingId(null);

    if (response.error || response.data?.error) {
      toast.error(response.data?.error || response.error?.message || 'Erro ao excluir funcionário');
      return;
    }

    toast.success(`Conta de ${employeeName} excluída com sucesso!`);
    fetchData();
  };

  const pendingApproval = employees.filter(u => !u.approved);
  const totalDelivered = deliveries.filter(d => d.status === 'delivered').length;
  const totalPending = deliveries.filter(d => d.status !== 'delivered').length;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'dashboard', label: 'Painel', icon: BarChart3 },
    { key: 'deliveries', label: 'Entregas', icon: Truck },
    { key: 'performance', label: 'Desempenho', icon: TrendingUp },
    { key: 'employees', label: 'Equipe', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-sm">Dudu Descartáveis</span>
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">ADMIN</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-full">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {tab === 'dashboard' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Visão geral das operações</p>
            </div>

            {pendingApproval.length > 0 && (
              <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-2xl p-4 flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-[hsl(var(--warning))]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{pendingApproval.length} funcionário(s) aguardando aprovação</p>
                  <p className="text-xs text-muted-foreground">Vá até a aba Equipe para aprovar</p>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => setTab('employees')}>Ver</Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total de Entregas', value: deliveries.length, sub: 'registradas' },
                { label: 'Entregues', value: totalDelivered, sub: deliveries.length > 0 ? `${Math.round((totalDelivered / deliveries.length) * 100)}% concluído` : '0%' },
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

            <div>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Atividade Recente</h2>
              <div className="space-y-2">
                {deliveries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registrada ainda.</p>
                )}
                {deliveries.slice(0, 3).map(d => {
                  const config = statusConfig[d.status as keyof typeof statusConfig];
                  const StatusIcon = config.icon;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.client}</p>
                        <p className="text-xs text-muted-foreground">{d.employee_name} • {config.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'deliveries' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Todas as Entregas</h1>
              <p className="text-sm text-muted-foreground">{deliveries.length} entregas registradas</p>
            </div>

            {deliveries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registrada ainda.</p>
            )}

            <div className="space-y-4">
              {Object.entries(
                deliveries.reduce<Record<string, Delivery[]>>((acc, d) => {
                  const name = d.employee_name || 'Sem nome';
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(d);
                  return acc;
                }, {})
              ).map(([employeeName, empDeliveries]) => {
                const isGroupExpanded = expandedGroups.includes(employeeName);
                const completed = empDeliveries.filter(d => d.status === 'delivered').length;

                return (
                  <div key={employeeName} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedGroups(prev =>
                        prev.includes(employeeName) ? prev.filter(n => n !== employeeName) : [...prev, employeeName]
                      )}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      {(() => {
                        const emp = employees.find(e => e.name === employeeName);
                        return emp?.avatar_url ? (
                          <img src={emp.avatar_url} alt={employeeName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                            {employeeName.charAt(0)}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{employeeName}</p>
                        <p className="text-xs text-muted-foreground">{empDeliveries.length} entrega(s) • {completed} entregue(s)</p>
                      </div>
                      {isGroupExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {isGroupExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {empDeliveries.map(delivery => {
                          const expanded = expandedId === delivery.id;
                          const config = statusConfig[delivery.status as keyof typeof statusConfig];
                          const StatusIcon = config.icon;

                          return (
                            <div key={delivery.id} className="bg-secondary rounded-xl overflow-hidden">
                              <button
                                onClick={() => setExpandedId(expanded ? null : delivery.id)}
                                className="w-full p-3 flex items-center gap-3 text-left"
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                                  <StatusIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{delivery.client}</p>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <p className="text-xs truncate">{delivery.address}</p>
                                  </div>
                                </div>
                                {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              </button>

                              {expanded && (
                                <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-3">
                                  <span className={`text-xs font-semibold rounded-full px-3 py-1 ${config.color}`}>
                                    {config.label}
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Itens</p>
                                    {delivery.delivery_items?.map(item => (
                                      <div key={item.id} className="flex justify-between text-sm py-0.5">
                                        <span>{item.name}</span>
                                        <span className="font-semibold text-muted-foreground">x{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {delivery.notes && (
                                    <div className="bg-background rounded-lg p-2">
                                      <p className="text-xs text-muted-foreground">📝 {delivery.notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'performance' && (
          <PerformanceCharts deliveries={deliveries} employees={employees} />
        )}

        {tab === 'employees' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Gestão de Equipe</h1>
                <p className="text-sm text-muted-foreground">{employees.length} funcionário(s)</p>
              </div>
              <Button onClick={() => setShowCreateEmployee(!showCreateEmployee)} className="rounded-full" size="sm">
                <UserPlus className="w-4 h-4 mr-1" /> Novo
              </Button>
            </div>

            {showCreateEmployee && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">Cadastrar Funcionário</h3>
                <Input
                  placeholder="Nome completo"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 rounded-full px-5 bg-secondary border-0"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11 rounded-full px-5 bg-secondary border-0"
                />
                <Input
                  placeholder="Senha (mín. 6 caracteres)"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                  className="h-11 rounded-full px-5 bg-secondary border-0"
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateEmployee} disabled={creating} className="flex-1 rounded-full h-11">
                    {creating ? 'Criando...' : 'Criar Funcionário'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateEmployee(false)} className="rounded-full h-11">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {pendingApproval.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Aguardando Aprovação</h2>
                {pendingApproval.map(user => (
                  <div key={user.id} className="bg-card border-2 border-[hsl(var(--warning))]/30 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                          {user.name.charAt(0)}
                        </div>
                      )}
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
              {employees.filter(u => u.approved).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário cadastrado ainda.</p>
              )}
              {employees.filter(u => u.approved).map(user => {
                const userDeliveries = deliveries.filter(d => d.employee_id === user.id);
                const completed = userDeliveries.filter(d => d.status === 'delivered').length;
                return (
                  <div key={user.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-lg font-bold">{completed}/{userDeliveries.length}</p>
                          <p className="text-[10px] text-muted-foreground">entregas</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEmployee(user.id, user.name)}
                          disabled={deletingId === user.id}
                          className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Excluir conta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

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
